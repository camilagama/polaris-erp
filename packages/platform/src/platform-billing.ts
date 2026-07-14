import "server-only";

import { hasBillableAccess, normalizeBillingStatus } from "@polaris/billing";
import { db } from "@polaris/db";
import { billingSubscriptions } from "@polaris/db/schema";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { eq, type SQL, sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toNumber,
  toRows,
  toStringValue,
} from "./internal/query-results";
import { recordPlatformAuditEvent } from "./platform-admin";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface PlatformBillingSubscriptionListItem {
  billingEmail: string | null;
  currentPeriodEnd: string | null;
  hasAccess: boolean;
  organizationId: string;
  planName: string;
  status: string;
  subscriptionId: string;
}

interface PlatformBillingInvoiceListItem {
  billingEmail: string | null;
  createdAt: string | null;
  organizationId: string;
  status: string;
  totalCents: number;
}

export interface PlatformBillingOverview {
  invoices: PlatformBillingInvoiceListItem[];
  subscriptions: PlatformBillingSubscriptionListItem[];
  totals: {
    activeAccessSubscriptions: number;
    openInvoices: number;
    subscriptions: number;
  };
}

type ManualPlatformBillingStatus = "active" | "past_due";
type MutationReturningRow = Record<string, unknown>;

export interface UpdatePlatformBillingSubscriptionStatusInput {
  actorPlatformAdminId: string;
  actorUserId: string;
  paymentEvidenceReference?: string;
  reason: string;
  status: ManualPlatformBillingStatus;
  subscriptionId: string;
}

interface PlatformBillingMutationTx {
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
  update: (table: unknown) => {
    set: (value: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: (
          value: Record<string, unknown>
        ) => Promise<MutationReturningRow[]> | MutationReturningRow[];
      };
    };
  };
}

interface PlatformBillingMutationDb {
  transaction: <Result>(
    callback: (tx: PlatformBillingMutationTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

const listSubscriptions = async (
  queryableDb: QueryableDb
): Promise<PlatformBillingSubscriptionListItem[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        s.organization_id,
        s.id as subscription_id,
        c.billing_email,
        p.name as plan_name,
        s.status,
        s.current_period_end
      from billing_subscriptions s
      inner join billing_plans p on p.id = s.plan_id
      left join billing_customers c on c.organization_id = s.organization_id
      order by s.created_at desc
      limit 50
    `)
  );

  return rows.map((row) => {
    const status = normalizeBillingStatus(toStringValue(row.status));

    return {
      billingEmail: toNullableString(row.billing_email),
      currentPeriodEnd: toIsoString(row.current_period_end),
      hasAccess: hasBillableAccess(status),
      organizationId: toStringValue(row.organization_id),
      planName: toStringValue(row.plan_name, "Sem plano"),
      status,
      subscriptionId: toStringValue(row.subscription_id),
    };
  });
};

const listInvoices = async (
  queryableDb: QueryableDb
): Promise<PlatformBillingInvoiceListItem[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        i.organization_id,
        c.billing_email,
        i.status,
        i.total_cents,
        i.created_at
      from billing_invoices i
      left join billing_customers c on c.organization_id = i.organization_id
      order by i.created_at desc
      limit 50
    `)
  );

  return rows.map((row) => ({
    billingEmail: toNullableString(row.billing_email),
    createdAt: toIsoString(row.created_at),
    organizationId: toStringValue(row.organization_id),
    status: toStringValue(row.status, "unknown"),
    totalCents: toNumber(row.total_cents),
  }));
};

const getTotals = async (
  queryableDb: QueryableDb
): Promise<PlatformBillingOverview["totals"]> => {
  const [row = {}] = toRows(
    await queryableDb.execute(sql`
      select
        (select count(*) from billing_subscriptions) as subscriptions,
        (select count(*) from billing_subscriptions where status = 'active') as active_access_subscriptions,
        (select count(*) from billing_invoices where status = 'open') as open_invoices
    `)
  );

  return {
    activeAccessSubscriptions: toNumber(row.active_access_subscriptions),
    openInvoices: toNumber(row.open_invoices),
    subscriptions: toNumber(row.subscriptions),
  };
};

export const getPlatformBillingOverview = async (
  queryableDb: QueryableDb = db
): Promise<PlatformBillingOverview> => {
  const [subscriptions, invoices, totals] = await Promise.all([
    listSubscriptions(queryableDb),
    listInvoices(queryableDb),
    getTotals(queryableDb),
  ]);

  return { invoices, subscriptions, totals };
};

export const getPlatformBillingOverviewForAdmin = async (
  platformAdminId: string
): Promise<PlatformBillingOverview> =>
  withPlatformAdminContext(platformAdminId, getPlatformBillingOverview);

const isManualPlatformBillingStatus = (
  value: string
): value is ManualPlatformBillingStatus =>
  value === "active" || value === "past_due";

const updatePlatformBillingSubscriptionStatusInTransaction = async (
  input: UpdatePlatformBillingSubscriptionStatusInput,
  tx: PlatformBillingMutationTx
): Promise<void> => {
  const reason = input.reason.trim();
  const paymentEvidenceReference = input.paymentEvidenceReference?.trim();

  if (reason.length === 0) {
    throw new Error("Billing subscription status change requires a reason.");
  }

  if (!isManualPlatformBillingStatus(input.status)) {
    throw new Error("Unsupported billing subscription status.");
  }

  if (input.status === "active" && !paymentEvidenceReference) {
    throw new Error(
      "Manual billing activation requires payment evidence reference."
    );
  }

  const updatedSubscriptions = await tx
    .update(billingSubscriptions)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(billingSubscriptions.id, input.subscriptionId))
    .returning({
      id: billingSubscriptions.id,
      organizationId: billingSubscriptions.organizationId,
    });

  const [subscription] = updatedSubscriptions;

  if (!subscription) {
    throw new Error("Billing subscription not found for status change.");
  }

  await recordPlatformAuditEvent(tx, {
    action: "billing.subscription.status_changed",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorUserId: input.actorUserId,
    metadata: {
      ...(paymentEvidenceReference ? { paymentEvidenceReference } : {}),
      reason,
      status: input.status,
    },
    subjectId: toStringValue(subscription.id, input.subscriptionId),
    subjectType: "billing_subscription",
  });
};

export const updatePlatformBillingSubscriptionStatus = async (
  input: UpdatePlatformBillingSubscriptionStatusInput,
  mutationDb?: PlatformBillingMutationDb
): Promise<void> => {
  const reason = input.reason.trim();
  const paymentEvidenceReference = input.paymentEvidenceReference?.trim();

  if (reason.length === 0) {
    throw new Error("Billing subscription status change requires a reason.");
  }

  if (!isManualPlatformBillingStatus(input.status)) {
    throw new Error("Unsupported billing subscription status.");
  }

  if (input.status === "active" && !paymentEvidenceReference) {
    throw new Error(
      "Manual billing activation requires payment evidence reference."
    );
  }

  if (mutationDb) {
    await mutationDb.transaction((tx) =>
      updatePlatformBillingSubscriptionStatusInTransaction(input, tx)
    );
    return;
  }

  await withPlatformAdminContext(input.actorPlatformAdminId, (tx) =>
    updatePlatformBillingSubscriptionStatusInTransaction(
      input,
      tx as unknown as PlatformBillingMutationTx
    )
  );
};
