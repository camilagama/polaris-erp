import "server-only";

import { type SQL, sql } from "drizzle-orm";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface WooviBillingEvent {
  correlationID: string | null;
  event: string | null;
  globalID: string | null;
  paymentSubscriptionGlobalID: string | null;
  status: string | null;
  value: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];

  return typeof value === "string" && value.length > 0 ? value : null;
};

const getNumber = (
  record: Record<string, unknown>,
  key: string
): number | null => {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseWooviBillingEvent = (
  payload: Record<string, unknown>
): WooviBillingEvent => ({
  correlationID: getString(payload, "correlationID"),
  event: getString(payload, "event"),
  globalID: getString(payload, "globalID"),
  paymentSubscriptionGlobalID: getString(
    payload,
    "paymentSubscriptionGlobalID"
  ),
  status: getString(payload, "status"),
  value: getNumber(payload, "value"),
});

export const mapWooviSubscriptionStatus = (
  payload: WooviBillingEvent
): "active" | "canceled" | "incomplete" | "past_due" | null => {
  if (payload.event === "PIX_AUTOMATIC_APPROVED") {
    return "active";
  }

  if (payload.event === "PIX_AUTOMATIC_COBR_REJECTED") {
    return "past_due";
  }

  if (payload.status === "CANCEL") {
    return "canceled";
  }

  return null;
};

const getSubscriptionByCorrelationId = async (
  db: QueryableDb,
  correlationID: string
): Promise<{ id: string; organizationId: string } | null> => {
  const result = await db.execute(sql`
    select id, organization_id
    from billing_subscriptions
    where id::text = ${correlationID}
       or ${correlationID} = 'billing-subscription:' || id::text
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

const linkWooviEntity = async (
  db: QueryableDb,
  {
    billingSubscriptionId,
    entityType,
    externalId,
    organizationId,
  }: {
    billingSubscriptionId: string;
    entityType: string;
    externalId: string;
    organizationId: string;
  }
): Promise<void> => {
  await db.execute(sql`
    insert into billing_provider_links (
      organization_id,
      provider,
      entity_type,
      external_id,
      billing_subscription_id
    )
    values (
      ${organizationId},
      'woovi',
      ${entityType},
      ${externalId},
      ${billingSubscriptionId}
    )
    on conflict (provider, entity_type, external_id) do nothing
  `);
};

export const reconcileWooviBillingEvent = async (
  db: QueryableDb,
  payload: Record<string, unknown>,
  providerEventId: string
): Promise<"processed" | "review"> => {
  const event = parseWooviBillingEvent(payload);

  if (!(event.correlationID && event.event)) {
    return "review";
  }

  const subscription = await getSubscriptionByCorrelationId(
    db,
    event.correlationID
  );

  if (!subscription) {
    return "review";
  }

  const subscriptionStatus = mapWooviSubscriptionStatus(event);

  if (subscriptionStatus) {
    await db.execute(sql`
      update billing_subscriptions
      set status = ${subscriptionStatus},
          updated_at = now()
      where id = ${subscription.id}
    `);
  }

  if (event.paymentSubscriptionGlobalID) {
    await linkWooviEntity(db, {
      billingSubscriptionId: subscription.id,
      entityType: "subscription",
      externalId: event.paymentSubscriptionGlobalID,
      organizationId: subscription.organizationId,
    });
  }

  if (event.globalID) {
    await linkWooviEntity(db, {
      billingSubscriptionId: subscription.id,
      entityType: "invoice",
      externalId: event.globalID,
      organizationId: subscription.organizationId,
    });
  }

  if (event.event.startsWith("PIX_AUTOMATIC_COBR")) {
    await db.execute(sql`
      insert into billing_payment_attempts (
        organization_id,
        billing_invoice_id,
        provider,
        provider_event_id,
        status,
        amount_cents
      )
      select
        i.organization_id,
        i.id,
        'woovi',
        ${providerEventId},
        case
          when ${event.event} = 'PIX_AUTOMATIC_COBR_COMPLETED' then 'succeeded'
          when ${event.event} in ('PIX_AUTOMATIC_COBR_REJECTED', 'PIX_AUTOMATIC_COBR_TRY_REJECTED') then 'failed'
          else 'pending'
        end,
        coalesce(${event.value}, i.total_cents)
      from billing_invoices i
      where i.billing_subscription_id = ${subscription.id}
      order by i.created_at desc
      limit 1
      on conflict (provider, provider_event_id) do nothing
    `);
  }

  return subscriptionStatus || event.event.startsWith("PIX_AUTOMATIC_COBR")
    ? "processed"
    : "review";
};
