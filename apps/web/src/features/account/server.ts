import "server-only";

import {
  type BillingSubscriptionStatus,
  FREE_PLAN_ID,
  normalizeBillingStatus,
  PAID_MONTHLY_PLAN_ID,
} from "@polaris/billing";
import {
  billingCustomers,
  billingPlans,
  billingSubscriptions,
} from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import {
  completeCommandExecution,
  enqueueOutboxEvent,
  reserveCommandExecution,
} from "@polaris/events";
import { desc, eq, sql } from "drizzle-orm";

export interface AccountBillingSummary {
  amountCents: number | null;
  billingEmail: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  interval: string | null;
  planId: string | null;
  planName: string | null;
  status: BillingSubscriptionStatus | null;
}

export const getAccountBillingSummary = async (
  organizationId: string
): Promise<AccountBillingSummary> => {
  const [row] = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        amountCents: billingPlans.amountCents,
        billingEmail: billingCustomers.billingEmail,
        cancelAtPeriodEnd: billingSubscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: billingSubscriptions.currentPeriodEnd,
        interval: billingPlans.interval,
        planId: billingPlans.id,
        planName: billingPlans.name,
        status: billingSubscriptions.status,
      })
      .from(billingSubscriptions)
      .leftJoin(
        billingCustomers,
        eq(billingSubscriptions.billingCustomerId, billingCustomers.id)
      )
      .leftJoin(billingPlans, eq(billingSubscriptions.planId, billingPlans.id))
      .where(eq(billingSubscriptions.organizationId, organizationId))
      .orderBy(
        sql`case when ${billingSubscriptions.status} = 'active' then 0 when ${billingSubscriptions.status} = 'incomplete' then 1 else 2 end`,
        desc(billingSubscriptions.createdAt)
      )
      .limit(1)
  );

  if (!row) {
    return {
      amountCents: null,
      billingEmail: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      interval: null,
      planId: null,
      planName: null,
      status: null,
    };
  }

  return {
    ...row,
    status: normalizeBillingStatus(row.status),
  };
};

export const canRequestSubscriptionCancellation = (
  billing: AccountBillingSummary
): boolean =>
  billing.status === "active" &&
  billing.cancelAtPeriodEnd === false &&
  billing.planId !== null &&
  billing.planId !== FREE_PLAN_ID;

export interface HostedCheckoutRequestResult {
  checkoutSessionId: string;
  checkoutUrl: string | null;
  status: "pending" | "ready" | "review";
}

interface HostedCheckoutSessionRow extends Record<string, unknown> {
  checkoutSessionId: string;
  checkoutUrl: string | null;
  status: "pending" | "ready" | "review";
}

const toHostedCheckoutRequestResult = (
  value: Record<string, unknown>
): HostedCheckoutRequestResult => {
  const checkoutSessionId = value.checkoutSessionId;
  const checkoutUrl = value.checkoutUrl;
  const status = value.status;

  if (
    typeof checkoutSessionId !== "string" ||
    checkoutSessionId.length === 0 ||
    (typeof checkoutUrl !== "string" && checkoutUrl !== null) ||
    (status !== "pending" && status !== "ready" && status !== "review")
  ) {
    throw new Error("Resultado de checkout hospedado invalido.");
  }

  return { checkoutSessionId, checkoutUrl, status };
};

const toHostedCheckoutSessionRow = (
  row: Record<string, unknown>
): HostedCheckoutRequestResult =>
  toHostedCheckoutRequestResult({
    checkoutSessionId: row.checkoutSessionId,
    checkoutUrl: row.checkoutUrl ?? null,
    status: row.status,
  });

const failCheckoutRequest = async (
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  commandId: string,
  message: string
): Promise<never> => {
  await completeCommandExecution(tx, {
    commandId,
    errorCode: "checkout_unavailable",
    result: { message },
    status: "failed",
  });
  throw new Error(message);
};

export const requestHostedCardCheckout = async ({
  actorUserId,
  idempotencyKey,
  organizationId,
}: {
  actorUserId: string;
  idempotencyKey: string;
  organizationId: string;
}): Promise<HostedCheckoutRequestResult> =>
  withTenantContext(organizationId, async (tx) => {
    const reservation = await reserveCommandExecution(tx, {
      commandType: "billing.checkout.asaas_card",
      correlationId: idempotencyKey,
      idempotencyKey,
      organizationId,
    });

    if (reservation.kind === "replay") {
      if (reservation.status === "failed") {
        throw new Error(
          reservation.errorCode ?? "Checkout hospedado nao esta disponivel."
        );
      }

      return toHostedCheckoutRequestResult(reservation.result);
    }

    if (reservation.kind === "processing") {
      throw new Error("Checkout hospedado ainda esta em processamento.");
    }

    await tx.execute(sql`
      select pg_advisory_xact_lock(hashtext(${`billing:checkout:${organizationId}`}))
    `);

    const [activePaidSubscription] = (
      await tx.execute<{ id: string }>(sql`
        select id
        from billing_subscriptions
        where organization_id = ${organizationId}
          and plan_id = ${PAID_MONTHLY_PLAN_ID}
          and status in ('trialing', 'active', 'past_due', 'paused')
        limit 1
      `)
    ).rows;

    if (activePaidSubscription) {
      return failCheckoutRequest(
        tx,
        reservation.commandId,
        "A organizacao ja possui uma assinatura paga ativa."
      );
    }

    const [openSession] = (
      await tx.execute<HostedCheckoutSessionRow>(sql`
        select id as "checkoutSessionId",
               checkout_url as "checkoutUrl",
               status
        from billing_checkout_sessions
        where organization_id = ${organizationId}
          and status in ('pending', 'ready', 'review')
        order by created_at desc
        limit 1
        for update
      `)
    ).rows;

    if (openSession) {
      const result = toHostedCheckoutSessionRow(openSession);
      await completeCommandExecution(tx, {
        commandId: reservation.commandId,
        result: {
          checkoutSessionId: result.checkoutSessionId,
          checkoutUrl: result.checkoutUrl,
          status: result.status,
        },
        status: "succeeded",
      });

      return result;
    }

    const [checkoutSession] = (
      await tx.execute<HostedCheckoutSessionRow>(sql`
        with subscription as (
          insert into billing_subscriptions (
            organization_id,
            plan_id,
            status
          )
          values (
            ${organizationId},
            ${PAID_MONTHLY_PLAN_ID},
            'incomplete'
          )
          returning id
        )
        insert into billing_checkout_sessions (
          organization_id,
          billing_subscription_id,
          provider,
          external_reference,
          idempotency_key,
          status,
          expires_at
        )
        select
          ${organizationId},
          subscription.id,
          'asaas',
          'billing-subscription:' || subscription.id::text,
          ${idempotencyKey},
          'pending',
          now() + interval '60 minutes'
        from subscription
        returning id as "checkoutSessionId",
                  checkout_url as "checkoutUrl",
                  status
      `)
    ).rows;

    if (!checkoutSession) {
      return failCheckoutRequest(
        tx,
        reservation.commandId,
        "Nao foi possivel preparar o checkout hospedado."
      );
    }

    const result = toHostedCheckoutSessionRow(checkoutSession);

    await tx.execute(sql`
      insert into audit_events (
        organization_id, actor_user_id, type, subject_type, subject_id, metadata
      ) values (
        ${organizationId}, ${actorUserId}, 'billing.checkout.requested',
        'billing_checkout_session', ${result.checkoutSessionId},
        jsonb_build_object('provider', 'asaas', 'payment_method', 'card')
      )
    `);
    await enqueueOutboxEvent(tx, {
      correlationId: idempotencyKey,
      eventType: "checkout.start",
      idempotencyKey: `billing-checkout-start:${result.checkoutSessionId}`,
      payload: { checkoutSessionId: result.checkoutSessionId },
      topic: "billing.checkout",
    });
    await completeCommandExecution(tx, {
      commandId: reservation.commandId,
      result: {
        checkoutSessionId: result.checkoutSessionId,
        checkoutUrl: result.checkoutUrl,
        status: result.status,
      },
      status: "succeeded",
    });

    return result;
  });

export const getHostedCardCheckout = async ({
  checkoutSessionId,
  organizationId,
}: {
  checkoutSessionId: string;
  organizationId: string;
}): Promise<HostedCheckoutRequestResult> =>
  withTenantContext(organizationId, async (tx) => {
    const [checkoutSession] = (
      await tx.execute<HostedCheckoutSessionRow>(sql`
        select id as "checkoutSessionId",
               checkout_url as "checkoutUrl",
               status
        from billing_checkout_sessions
        where id = ${checkoutSessionId}
          and organization_id = ${organizationId}
          and status in ('pending', 'ready', 'review')
        limit 1
      `)
    ).rows;

    if (!checkoutSession) {
      throw new Error("Checkout hospedado nao foi encontrado.");
    }

    return toHostedCheckoutSessionRow(checkoutSession);
  });

interface CancellationSubscriptionRow extends Record<string, unknown> {
  cancelAtPeriodEnd: boolean;
  externalId: string;
  id: string;
  provider: "asaas" | "woovi";
}

const toCancellationResult = (
  value: Record<string, unknown>
): { subscriptionId: string } => {
  const subscriptionId = value.subscriptionId;

  if (typeof subscriptionId !== "string" || subscriptionId.length === 0) {
    throw new Error("Resultado de cancelamento de assinatura invalido.");
  }

  return { subscriptionId };
};

export const requestSubscriptionCancellation = async ({
  actorUserId,
  idempotencyKey,
  organizationId,
}: {
  actorUserId: string;
  idempotencyKey: string;
  organizationId: string;
}): Promise<{ subscriptionId: string }> =>
  withTenantContext(organizationId, async (tx) => {
    const reservation = await reserveCommandExecution(tx, {
      commandType: "billing.cancel_at_period_end",
      correlationId: idempotencyKey,
      idempotencyKey,
      organizationId,
    });

    if (reservation.kind === "replay") {
      return toCancellationResult(reservation.result);
    }

    if (reservation.kind === "processing") {
      throw new Error(
        "Cancelamento de assinatura ainda esta em processamento."
      );
    }

    const subscriptionResult =
      await tx.execute<CancellationSubscriptionRow>(sql`
      select subscription.id,
             provider_link.provider,
             provider_link.external_id as "externalId",
             subscription.cancel_at_period_end as "cancelAtPeriodEnd"
      from billing_subscriptions as subscription
      inner join billing_provider_links as provider_link
        on provider_link.billing_subscription_id = subscription.id
        and provider_link.entity_type = 'subscription'
      where subscription.organization_id = ${organizationId}
        and subscription.status = 'active'
      order by subscription.created_at desc
      limit 1
      for update of subscription
    `);
    const subscription = subscriptionResult.rows[0];

    if (!subscription) {
      throw new Error("Assinatura ativa com provider nao encontrada.");
    }

    const result = { subscriptionId: subscription.id };

    if (subscription.cancelAtPeriodEnd) {
      await completeCommandExecution(tx, {
        commandId: reservation.commandId,
        result,
        status: "succeeded",
      });

      return result;
    }

    await tx.execute(sql`
      update billing_subscriptions
      set cancel_at_period_end = true,
          updated_at = now()
      where id = ${subscription.id}
        and organization_id = ${organizationId}
        and status = 'active'
    `);
    await tx.execute(sql`
      insert into audit_events (
        organization_id, actor_user_id, type, subject_type, subject_id, metadata
      ) values (
        ${organizationId}, ${actorUserId}, 'billing.subscription.cancellation_requested',
        'billing_subscription', ${subscription.id},
        jsonb_build_object('provider', ${subscription.provider})
      )
    `);
    await enqueueOutboxEvent(tx, {
      correlationId: idempotencyKey,
      eventType: "subscription.cancel_at_period_end",
      idempotencyKey: `billing-cancel:${organizationId}:${idempotencyKey}`,
      payload: {
        provider: subscription.provider,
        providerSubscriptionId: subscription.externalId,
        subscriptionId: subscription.id,
      },
      topic: "billing.subscription",
    });
    await completeCommandExecution(tx, {
      commandId: reservation.commandId,
      result,
      status: "succeeded",
    });

    return result;
  });
