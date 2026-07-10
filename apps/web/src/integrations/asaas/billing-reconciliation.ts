import "server-only";

import { type SQL, sql } from "drizzle-orm";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface AsaasBillingEvent {
  billingType: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  event: string | null;
  externalReference: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  valueCents: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRecord = (
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> => {
  const value = record[key];

  return isRecord(value) ? value : {};
};

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];

  return typeof value === "string" && value.length > 0 ? value : null;
};

const getMoneyCents = (
  record: Record<string, unknown>,
  key: string
): number | null => {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  return null;
};

const getSubscriptionByExternalReference = async (
  db: QueryableDb,
  externalReference: string
): Promise<{ id: string; organizationId: string } | null> => {
  const result = await db.execute(sql`
    select id, organization_id
    from billing_subscriptions
    where id::text = ${externalReference}
       or ${externalReference} = 'billing-subscription:' || id::text
    limit 1
  `);
  const rows =
    isRecord(result) && Array.isArray(result.rows) ? result.rows : [];
  const [row] = rows.filter(isRecord);

  if (!row) {
    return null;
  }

  const id = getString(row, "id");
  const organizationId = getString(row, "organization_id");

  return id && organizationId ? { id, organizationId } : null;
};

const parseAsaasBillingEvent = (
  payload: Record<string, unknown>
): AsaasBillingEvent => {
  const payment = getRecord(payload, "payment");
  const subscription = getRecord(payload, "subscription");
  const creditCard = getRecord(payment, "creditCard");
  const subscriptionId =
    getString(payment, "subscription") ?? getString(subscription, "id");

  return {
    billingType: getString(payment, "billingType"),
    cardBrand: getString(creditCard, "creditCardBrand"),
    cardLast4: getString(creditCard, "creditCardNumber"),
    event: getString(payload, "event"),
    externalReference:
      getString(payment, "externalReference") ??
      getString(subscription, "externalReference"),
    paymentId: getString(payment, "id"),
    paymentStatus: getString(payment, "status"),
    subscriptionId,
    subscriptionStatus: getString(subscription, "status"),
    valueCents:
      getMoneyCents(payment, "value") ?? getMoneyCents(subscription, "value"),
  };
};

export const mapAsaasSubscriptionStatus = (
  event: AsaasBillingEvent
): "active" | "canceled" | "incomplete" | "past_due" | null => {
  if (event.subscriptionStatus === "ACTIVE") {
    return "active";
  }

  if (event.subscriptionStatus === "INACTIVE") {
    return "canceled";
  }

  if (event.event === "PAYMENT_OVERDUE") {
    return "past_due";
  }

  if (
    event.event === "PAYMENT_RECEIVED" ||
    event.event === "PAYMENT_CONFIRMED"
  ) {
    return "active";
  }

  if (event.event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") {
    return "past_due";
  }

  return null;
};

const mapAsaasInvoiceStatus = (event: AsaasBillingEvent): string => {
  if (
    event.event === "PAYMENT_RECEIVED" ||
    event.event === "PAYMENT_CONFIRMED"
  ) {
    return "paid";
  }

  if (event.event === "PAYMENT_OVERDUE") {
    return "open";
  }

  if (event.event === "PAYMENT_DELETED") {
    return "void";
  }

  return "open";
};

const mapAsaasAttemptStatus = (event: AsaasBillingEvent): string => {
  if (
    event.event === "PAYMENT_RECEIVED" ||
    event.event === "PAYMENT_CONFIRMED"
  ) {
    return "succeeded";
  }

  if (event.event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") {
    return "failed";
  }

  return "pending";
};

export const reconcileAsaasBillingEvent = async (
  db: QueryableDb,
  payload: Record<string, unknown>,
  providerEventId: string
): Promise<"processed" | "review"> => {
  const event = parseAsaasBillingEvent(payload);

  if (!(event.event && event.externalReference)) {
    return "review";
  }

  const subscription = await getSubscriptionByExternalReference(
    db,
    event.externalReference
  );

  if (!subscription) {
    return "review";
  }

  const subscriptionStatus = mapAsaasSubscriptionStatus(event);

  if (subscriptionStatus) {
    await db.execute(sql`
      update billing_subscriptions
      set status = ${subscriptionStatus},
          updated_at = now()
      where id = ${subscription.id}
    `);
  }

  if (event.subscriptionId) {
    await db.execute(sql`
      insert into billing_provider_links (
        organization_id,
        provider,
        entity_type,
        external_id,
        billing_subscription_id
      )
      values (
        ${subscription.organizationId},
        'asaas',
        'subscription',
        ${event.subscriptionId},
        ${subscription.id}
      )
      on conflict (provider, entity_type, external_id) do nothing
    `);
  }

  if (event.cardBrand || event.cardLast4) {
    await db.execute(sql`
      insert into billing_provider_links (
        organization_id,
        provider,
        entity_type,
        external_id,
        billing_subscription_id,
        card_brand,
        card_last4
      )
      values (
        ${subscription.organizationId},
        'asaas',
        'payment_method',
        ${event.subscriptionId ?? providerEventId},
        ${subscription.id},
        ${event.cardBrand},
        ${event.cardLast4?.slice(-4) ?? null}
      )
      on conflict (provider, entity_type, external_id) do update
      set card_brand = excluded.card_brand,
          card_last4 = excluded.card_last4,
          updated_at = now()
    `);
  }

  if (event.paymentId) {
    await db.execute(sql`
      with existing_invoice as (
        select billing_invoice_id as id
        from billing_provider_links
        where provider = 'asaas'
          and entity_type = 'invoice'
          and external_id = ${event.paymentId}
          and billing_invoice_id is not null
      ),
      inserted_invoice as (
        insert into billing_invoices (
          organization_id,
          billing_subscription_id,
          status,
          currency,
          subtotal_cents,
          total_cents,
          paid_at
        )
        select
          ${subscription.organizationId},
          ${subscription.id},
          ${mapAsaasInvoiceStatus(event)},
          'BRL',
          coalesce(${event.valueCents}, 0),
          coalesce(${event.valueCents}, 0),
          case when ${mapAsaasInvoiceStatus(event)} = 'paid' then now() else null end
        where not exists (select 1 from existing_invoice)
        returning id
      ),
      target_invoice as (
        select id from existing_invoice
        union all
        select id from inserted_invoice
      ),
      linked_invoice as (
        insert into billing_provider_links (
          organization_id,
          provider,
          entity_type,
          external_id,
          billing_subscription_id,
          billing_invoice_id
        )
        select
          ${subscription.organizationId},
          'asaas',
          'invoice',
          ${event.paymentId},
          ${subscription.id},
          id
        from target_invoice
        on conflict (provider, entity_type, external_id) do nothing
        returning billing_invoice_id
      )
      insert into billing_payment_attempts (
        organization_id,
        billing_invoice_id,
        provider,
        provider_event_id,
        status,
        amount_cents
      )
      select
        ${subscription.organizationId},
        id,
        'asaas',
        ${providerEventId},
        ${mapAsaasAttemptStatus(event)},
        coalesce(${event.valueCents}, 0)
      from target_invoice
      on conflict (provider, provider_event_id) do nothing
    `);
  }

  return subscriptionStatus || event.paymentId ? "processed" : "review";
};
