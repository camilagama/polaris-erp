import "server-only";

import { FREE_PLAN_ID, PAID_MONTHLY_PLAN_ID } from "@polaris/billing";
import { type SQL, sql } from "drizzle-orm";

const ASAAS_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface TransactionalDb extends QueryableDb {
  transaction: <T>(
    callback: (transaction: QueryableDb) => Promise<T>
  ) => Promise<T>;
}

interface AsaasBillingEvent {
  billingType: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  event: string | null;
  externalReference: string | null;
  occurredAt?: Date | null;
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

const getAsaasOccurredAt = (record: Record<string, unknown>): Date | null => {
  const value = getString(record, "dateCreated");

  if (!value) {
    return null;
  }

  const isoValue = ASAAS_TIMESTAMP_PATTERN.test(value)
    ? `${value.replace(" ", "T")}-03:00`
    : value;
  const occurredAt = new Date(isoValue);

  return Number.isNaN(occurredAt.getTime()) ? null : occurredAt;
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
    occurredAt: getAsaasOccurredAt(payload),
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

const demoteFreeSubscriptionForPaidActivation = async (
  transaction: QueryableDb,
  {
    occurredAt,
    organizationId,
    subscriptionId,
  }: {
    occurredAt: Date;
    organizationId: string;
    subscriptionId: string;
  }
): Promise<void> => {
  await transaction.execute(sql`
    update billing_subscriptions as free_subscription
    set status = 'canceled',
        canceled_at = coalesce(canceled_at, now()),
        updated_at = now()
    where free_subscription.organization_id = ${organizationId}
      and free_subscription.plan_id = ${FREE_PLAN_ID}
      and free_subscription.status in ('trialing', 'active', 'past_due', 'paused')
      and free_subscription.id <> ${subscriptionId}
      and exists (
        select 1
        from billing_subscriptions as paid_subscription
        where paid_subscription.id = ${subscriptionId}
          and paid_subscription.plan_id = ${PAID_MONTHLY_PLAN_ID}
          and (
            paid_subscription.last_provider_event_at is null
            or paid_subscription.last_provider_event_at <= ${occurredAt}
          )
      )
  `);
};

const reconcileSubscriptionStatus = async (
  transaction: QueryableDb,
  event: AsaasBillingEvent,
  subscription: { id: string; organizationId: string }
): Promise<"active" | "canceled" | "incomplete" | "past_due" | null> => {
  const subscriptionStatus = mapAsaasSubscriptionStatus(event);

  if (!(subscriptionStatus && event.occurredAt)) {
    return subscriptionStatus;
  }

  if (subscriptionStatus === "active") {
    await demoteFreeSubscriptionForPaidActivation(transaction, {
      occurredAt: event.occurredAt,
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
    });
  }

  await transaction.execute(sql`
    update billing_subscriptions
    set status = ${subscriptionStatus},
        grace_period_ends_at = case
          when ${subscriptionStatus} = 'past_due' then coalesce(
            grace_period_ends_at,
            coalesce(current_period_end, ${event.occurredAt}) + interval '7 days'
          )
          when ${subscriptionStatus} = 'active' then null
          else grace_period_ends_at
        end,
        last_provider_event_at = ${event.occurredAt},
        updated_at = now()
    where id = ${subscription.id}
      and (
        last_provider_event_at is null
        or last_provider_event_at <= ${event.occurredAt}
      )
  `);

  return subscriptionStatus;
};

export const reconcileAsaasBillingEvent = async (
  db: TransactionalDb,
  payload: Record<string, unknown>,
  providerEventId: string
): Promise<"processed" | "review"> => {
  const event = parseAsaasBillingEvent(payload);

  if (!(event.event && event.externalReference)) {
    return "review";
  }

  const externalReference = event.externalReference;

  return await db.transaction(async (transaction) => {
    const subscription = await getSubscriptionByExternalReference(
      transaction,
      externalReference
    );

    if (!subscription) {
      return "review";
    }

    await transaction.execute(sql`
      select pg_advisory_xact_lock(
        hashtext(${`billing:organization:${subscription.organizationId}`})
      )
    `);

    const subscriptionStatus = await reconcileSubscriptionStatus(
      transaction,
      event,
      subscription
    );

    if (event.subscriptionId) {
      await transaction.execute(sql`
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
      await transaction.execute(sql`
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
      await transaction.execute(sql`
      select pg_advisory_xact_lock(hashtext(${`asaas:invoice:${event.paymentId}`}))
    `);

      await transaction.execute(sql`
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
        on conflict (provider, entity_type, external_id) do update
        set billing_invoice_id = coalesce(
              billing_provider_links.billing_invoice_id,
              excluded.billing_invoice_id
            ),
            billing_subscription_id = coalesce(
              billing_provider_links.billing_subscription_id,
              excluded.billing_subscription_id
            ),
            updated_at = now()
        returning billing_invoice_id as id
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
      from linked_invoice
      on conflict (provider, provider_event_id)
        where provider_event_id is not null
        do nothing
    `);
    }

    return (subscriptionStatus && !event.occurredAt) ||
      !(subscriptionStatus || event.paymentId)
      ? "review"
      : "processed";
  });
};
