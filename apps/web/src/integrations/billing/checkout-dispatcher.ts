import "server-only";

import {
  AsaasCheckoutRejectedError,
  AsaasCheckoutUnknownOutcomeError,
  type CreateAsaasHostedCheckoutInput,
  type CreateAsaasHostedCheckoutResult,
} from "@polaris/billing/providers/asaas";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import { sql } from "drizzle-orm";

export interface BillingCheckoutPayload {
  checkoutSessionId: string;
}

interface CheckoutSessionRow extends Record<string, unknown> {
  amountCents: number;
  checkoutSessionId: string;
  description: string;
  externalReference: string;
  itemName: string;
}

export interface BillingCheckoutAdapters {
  createAsaasHostedRecurringCheckout: (
    input: CreateAsaasHostedCheckoutInput
  ) => Promise<CreateAsaasHostedCheckoutResult>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseBillingCheckoutPayload = (
  payload: unknown
): BillingCheckoutPayload => {
  if (!isRecord(payload)) {
    throw new Error("Invalid billing checkout payload.");
  }

  const checkoutSessionId = payload.checkoutSessionId;

  if (
    typeof checkoutSessionId !== "string" ||
    checkoutSessionId.trim().length === 0
  ) {
    throw new Error("Invalid billing checkout payload.");
  }

  return { checkoutSessionId };
};

const toRows = (result: unknown): Record<string, unknown>[] => {
  if (typeof result !== "object" || result === null || !("rows" in result)) {
    return [];
  }

  const rows = (result as { rows?: unknown }).rows;

  return Array.isArray(rows) ? rows.filter(isRecord) : [];
};

const toCheckoutSessionRow = (
  value: Record<string, unknown>
): CheckoutSessionRow | null => {
  const amountCents = value.amountCents;
  const checkoutSessionId = value.checkoutSessionId;
  const description = value.description;
  const externalReference = value.externalReference;
  const itemName = value.itemName;

  if (
    typeof amountCents !== "number" ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    typeof checkoutSessionId !== "string" ||
    typeof description !== "string" ||
    typeof externalReference !== "string" ||
    typeof itemName !== "string"
  ) {
    return null;
  }

  return {
    amountCents,
    checkoutSessionId,
    description,
    externalReference,
    itemName,
  };
};

const claimCheckoutSession = async (
  checkoutSessionId: string
): Promise<CheckoutSessionRow | null> =>
  withInternalJobContext("billing_checkout", async (tx) => {
    const rows = toRows(
      await tx.execute(sql`
        select checkout.id as "checkoutSessionId",
               checkout.status,
               checkout.provider_request_started_at as "providerRequestStartedAt",
               checkout.expires_at as "expiresAt",
               checkout.external_reference as "externalReference",
               plan.amount_cents as "amountCents",
               plan.name as "itemName",
               plan.name || ' - assinatura mensal' as description
        from billing_checkout_sessions as checkout
        inner join billing_subscriptions as subscription
          on subscription.id = checkout.billing_subscription_id
        inner join billing_plans as plan
          on plan.id = subscription.plan_id
        where checkout.id = ${checkoutSessionId}
          and checkout.provider = 'asaas'
        limit 1
        for update of checkout
      `)
    );
    const checkout = rows.at(0);

    if (checkout?.status !== "pending") {
      return null;
    }

    if (
      checkout.expiresAt instanceof Date &&
      checkout.expiresAt <= new Date()
    ) {
      await tx.execute(sql`
        update billing_checkout_sessions
        set status = 'expired', updated_at = now()
        where id = ${checkoutSessionId}
          and status = 'pending'
      `);
      return null;
    }

    if (checkout.providerRequestStartedAt !== null) {
      await tx.execute(sql`
        update billing_checkout_sessions
        set status = 'review',
            last_error = 'provider_request_outcome_unknown',
            updated_at = now()
        where id = ${checkoutSessionId}
          and status = 'pending'
      `);
      return null;
    }

    await tx.execute(sql`
      update billing_checkout_sessions
      set provider_request_started_at = now(),
          last_error = null,
          updated_at = now()
      where id = ${checkoutSessionId}
        and status = 'pending'
        and provider_request_started_at is null
    `);

    return toCheckoutSessionRow(checkout);
  });

const markCheckoutProviderRejected = async (
  checkoutSessionId: string
): Promise<void> => {
  await withInternalJobContext("billing_checkout", (tx) =>
    tx.execute(sql`
      update billing_checkout_sessions
      set provider_request_started_at = null,
          last_error = 'provider_rejected',
          updated_at = now()
      where id = ${checkoutSessionId}
        and status = 'pending'
    `)
  );
};

const markCheckoutForReview = async (
  checkoutSessionId: string
): Promise<void> => {
  await withInternalJobContext("billing_checkout", (tx) =>
    tx.execute(sql`
      update billing_checkout_sessions
      set status = 'review',
          last_error = 'provider_request_outcome_unknown',
          updated_at = now()
      where id = ${checkoutSessionId}
        and status = 'pending'
    `)
  );
};

const persistProviderCheckout = async ({
  checkoutSessionId,
  providerCheckout,
}: {
  checkoutSessionId: string;
  providerCheckout: CreateAsaasHostedCheckoutResult;
}): Promise<void> => {
  await withInternalJobContext("billing_checkout", (tx) =>
    tx.execute(sql`
      with checkout as (
        update billing_checkout_sessions
        set provider_checkout_id = ${providerCheckout.checkoutId},
            checkout_url = ${providerCheckout.checkoutUrl},
            status = 'ready',
            last_error = null,
            updated_at = now()
        where id = ${checkoutSessionId}
          and status = 'pending'
        returning organization_id, billing_subscription_id
      )
      insert into billing_provider_links (
        organization_id,
        provider,
        entity_type,
        external_id,
        billing_subscription_id
      )
      select
        organization_id,
        'asaas',
        'checkout',
        ${providerCheckout.checkoutId},
        billing_subscription_id
      from checkout
      on conflict (provider, entity_type, external_id) do nothing
    `)
  );
};

const getCallbackUrl = (
  canonicalAppUrl: string,
  state: "cancel" | "expired" | "success"
): string => {
  const url = new URL("/configuracoes", canonicalAppUrl);
  url.searchParams.set("checkout", state);

  return url.toString();
};

export const dispatchHostedCardCheckout = async (
  payload: unknown,
  {
    adapters,
    canonicalAppUrl,
  }: {
    adapters: BillingCheckoutAdapters;
    canonicalAppUrl: string;
  }
): Promise<void> => {
  const { checkoutSessionId } = parseBillingCheckoutPayload(payload);
  const checkout = await claimCheckoutSession(checkoutSessionId);

  if (!checkout) {
    return;
  }

  try {
    const providerCheckout = await adapters.createAsaasHostedRecurringCheckout({
      callback: {
        cancelUrl: getCallbackUrl(canonicalAppUrl, "cancel"),
        expiredUrl: getCallbackUrl(canonicalAppUrl, "expired"),
        successUrl: getCallbackUrl(canonicalAppUrl, "success"),
      },
      cycle: "MONTHLY",
      description: checkout.description,
      externalReference: checkout.externalReference,
      itemName: checkout.itemName,
      minutesToExpire: 60,
      nextDueDate: new Date().toISOString().slice(0, 10),
      value: checkout.amountCents / 100,
    });

    await persistProviderCheckout({ checkoutSessionId, providerCheckout });
  } catch (error) {
    if (error instanceof AsaasCheckoutRejectedError) {
      await markCheckoutProviderRejected(checkoutSessionId);
      throw error;
    }

    if (error instanceof AsaasCheckoutUnknownOutcomeError) {
      await markCheckoutForReview(checkoutSessionId);
      return;
    }

    await markCheckoutForReview(checkoutSessionId);
    throw error;
  }
};
