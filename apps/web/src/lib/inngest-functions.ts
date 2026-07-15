import { createAsaasBillingAdapter } from "@polaris/billing/providers/asaas";
import { createWooviBillingAdapter } from "@polaris/billing/providers/woovi";
import { db } from "@polaris/db";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import {
  claimOutboxEvent,
  listClaimableOutboxEventIds,
  markOutboxEventFailed,
  markOutboxEventObserved,
  markOutboxEventProcessed,
  type QueryableDb,
} from "@polaris/events";
import { reconcileAsaasBillingEvent } from "@/integrations/asaas/billing-reconciliation";
import { dispatchBillingSubscriptionCancellation } from "@/integrations/billing/cancellation-dispatcher";
import { dispatchHostedCardCheckout } from "@/integrations/billing/checkout-dispatcher";
import { recordResendEmailEvent } from "@/integrations/resend/email-service";
import { markWebhookIntakeProcessed } from "@/integrations/webhooks/intake";
import { reconcileWooviBillingEvent } from "@/integrations/woovi/billing-reconciliation";
import { serverEnv } from "@/lib/env";
import { inngest, OUTBOX_EVENT_PENDING } from "@/lib/inngest-client";
import {
  createSafeOperationalError,
  reportTerminalOutboxFailure,
} from "@/lib/observability";

type OutboxDispatcher = (
  event: NonNullable<Awaited<ReturnType<typeof claimOutboxEvent>>>
) => Promise<void>;

export const CAPTURE_ONLY_OUTBOX_TOPICS = [] as const;

const captureOnlyOutboxTopics = new Set<string>(CAPTURE_ONLY_OUTBOX_TOPICS);
const outboxDispatchers = new Map<string, OutboxDispatcher>();

const getDispatcherKey = (topic: string, eventType: string): string =>
  `${topic}:${eventType}`;

export const registerOutboxDispatcher = ({
  dispatcher,
  eventType,
  topic,
}: {
  dispatcher: OutboxDispatcher;
  eventType: string;
  topic: string;
}): void => {
  outboxDispatchers.set(getDispatcherKey(topic, eventType), dispatcher);
};

export const processOutboxEvent = async (
  database: QueryableDb,
  outboxEventId: string
): Promise<"failed" | "observed" | "processed" | "skipped"> => {
  const event = await claimOutboxEvent(database, outboxEventId);

  if (!event) {
    return "skipped";
  }

  const dispatcher =
    outboxDispatchers.get(getDispatcherKey(event.topic, event.eventType)) ??
    outboxDispatchers.get(getDispatcherKey(event.topic, "*"));

  if (!dispatcher) {
    if (captureOnlyOutboxTopics.has(event.topic)) {
      const observed = await markOutboxEventObserved(
        database,
        event.id,
        event.claimToken,
        `Outbox topic ${event.topic} is capture-only and is not dispatched.`
      );

      return observed ? "observed" : "skipped";
    }

    const error = `No outbox dispatcher registered for ${event.topic}:${event.eventType}.`;

    const failed = await markOutboxEventFailed({
      attempts: event.attempts,
      claimToken: event.claimToken,
      db: database,
      error,
      eventId: event.id,
    });

    if (failed && event.attempts >= 5) {
      reportTerminalOutboxFailure({
        correlationId: event.correlationId,
        eventId: event.id,
        eventType: event.eventType,
        topic: event.topic,
      });
    }

    return failed ? "failed" : "skipped";
  }

  try {
    await dispatcher(event);
    const processed = await markOutboxEventProcessed(
      database,
      event.id,
      event.claimToken
    );

    return processed ? "processed" : "skipped";
  } catch {
    const failureDiagnostic = `outbox_dispatch_failed:${event.topic}:${event.eventType}`;
    const failed = await markOutboxEventFailed({
      attempts: event.attempts,
      claimToken: event.claimToken,
      db: database,
      error: failureDiagnostic,
      eventId: event.id,
    });

    if (failed) {
      if (event.attempts >= 5) {
        reportTerminalOutboxFailure({
          correlationId: event.correlationId,
          eventId: event.id,
          eventType: event.eventType,
          topic: event.topic,
        });
      }

      throw createSafeOperationalError("outbox_dispatch_failed");
    }

    return "skipped";
  }
};

const getProviderEventId = (payload: Record<string, unknown>): string => {
  const providerEventId = payload.providerEventId;

  if (typeof providerEventId !== "string" || providerEventId.length === 0) {
    throw new Error("Billing webhook outbox event is missing providerEventId.");
  }

  return providerEventId;
};

registerOutboxDispatcher({
  dispatcher: async (event) => {
    const providerEventId = getProviderEventId(event.payload);
    const reconciliationStatus = await withInternalJobContext(
      "billing_webhook_reconcile",
      (transaction) =>
        reconcileAsaasBillingEvent(transaction, event.payload, providerEventId)
    );

    await markWebhookIntakeProcessed({
      eventId: providerEventId,
      lastError: reconciliationStatus === "processed" ? null : "manual_review",
      provider: "asaas",
      status: reconciliationStatus === "processed" ? "processed" : "failed",
    });
  },
  eventType: "*",
  topic: "asaas.webhook",
});

registerOutboxDispatcher({
  dispatcher: async (event) => {
    await dispatchBillingSubscriptionCancellation(event.payload, {
      cancelAsaasSubscription: async (providerSubscriptionId) => {
        if (!(serverEnv.ASAAS_API_BASE_URL && serverEnv.ASAAS_API_KEY)) {
          throw new Error(
            "Asaas billing provider credentials are not configured."
          );
        }

        const asaas = createAsaasBillingAdapter({
          apiKey: serverEnv.ASAAS_API_KEY,
          baseUrl: serverEnv.ASAAS_API_BASE_URL,
          fetch,
        });
        await asaas.cancelSubscription(providerSubscriptionId);
      },
      cancelWooviSubscription: async (providerSubscriptionId) => {
        if (!(serverEnv.WOOVI_API_BASE_URL && serverEnv.WOOVI_API_KEY)) {
          throw new Error(
            "Woovi billing provider credentials are not configured."
          );
        }

        const woovi = createWooviBillingAdapter({
          apiKey: serverEnv.WOOVI_API_KEY,
          baseUrl: serverEnv.WOOVI_API_BASE_URL,
          fetch,
        });
        await woovi.cancelPixRecurringSubscription(providerSubscriptionId);
      },
    });
  },
  eventType: "subscription.cancel_at_period_end",
  topic: "billing.subscription",
});

registerOutboxDispatcher({
  dispatcher: async (event) => {
    if (!(serverEnv.ASAAS_API_BASE_URL && serverEnv.ASAAS_API_KEY)) {
      throw new Error("Asaas billing provider credentials are not configured.");
    }

    const asaas = createAsaasBillingAdapter({
      apiKey: serverEnv.ASAAS_API_KEY,
      baseUrl: serverEnv.ASAAS_API_BASE_URL,
      fetch,
    });
    await dispatchHostedCardCheckout(event.payload, {
      adapters: {
        createAsaasHostedRecurringCheckout: asaas.createHostedRecurringCheckout,
      },
      canonicalAppUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    });
  },
  eventType: "checkout.start",
  topic: "billing.checkout",
});

registerOutboxDispatcher({
  dispatcher: async (event) => {
    const providerEventId = getProviderEventId(event.payload);
    await recordResendEmailEvent(db, {
      event: event.payload,
      providerEventId,
    });
    await markWebhookIntakeProcessed({
      eventId: providerEventId,
      provider: "resend",
      status: "processed",
    });
  },
  eventType: "*",
  topic: "resend.webhook",
});

registerOutboxDispatcher({
  dispatcher: async (event) => {
    const providerEventId = getProviderEventId(event.payload);
    const reconciliationStatus = await withInternalJobContext(
      "billing_webhook_reconcile",
      (transaction) =>
        reconcileWooviBillingEvent(transaction, event.payload, providerEventId)
    );

    await markWebhookIntakeProcessed({
      eventId: providerEventId,
      lastError: reconciliationStatus === "processed" ? null : "manual_review",
      provider: "woovi",
      status: reconciliationStatus === "processed" ? "processed" : "failed",
    });
  },
  eventType: "*",
  topic: "woovi.webhook",
});

export const processClaimableOutboxEvents = async (
  database: QueryableDb
): Promise<Array<"failed" | "observed" | "processed" | "skipped">> => {
  const eventIds = await listClaimableOutboxEventIds(database);
  const results: Array<"failed" | "observed" | "processed" | "skipped"> = [];

  for (const eventId of eventIds) {
    results.push(await processOutboxEvent(database, eventId));
  }

  return results;
};

const processOutboxEventFunction = inngest.createFunction(
  {
    id: "process-outbox-event",
    name: "Process outbox event",
    triggers: [{ event: OUTBOX_EVENT_PENDING }],
  },
  async ({ event, step }) => {
    const outboxEventId = event.data.outboxEventId;

    if (typeof outboxEventId !== "string" || outboxEventId.length === 0) {
      return { status: "skipped" as const };
    }

    const status = await step.run("process-outbox-event", () =>
      processOutboxEvent(db, outboxEventId)
    );

    return { status };
  }
);

const recoverOutboxEventsFunction = inngest.createFunction(
  {
    concurrency: { limit: 1 },
    id: "recover-outbox-events",
    retries: 3,
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }) => {
    const statuses = await step.run("recover-claimable-outbox-events", () =>
      processClaimableOutboxEvents(db)
    );

    return { processedCount: statuses.length, statuses };
  }
);

export const inngestFunctions = [
  processOutboxEventFunction,
  recoverOutboxEventsFunction,
];
