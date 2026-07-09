import "server-only";

import { hasBillableAccess, normalizeBillingStatus } from "@polaris/billing";
import { type SQL, sql } from "drizzle-orm";
import { db } from "@/db";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface PlatformBillingSubscriptionListItem {
  currentPeriodEnd: string | null;
  hasAccess: boolean;
  organizationId: string;
  organizationName: string;
  planName: string;
  status: string;
}

interface PlatformBillingInvoiceListItem {
  createdAt: string | null;
  organizationName: string;
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

const toRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return result.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null
    );
  }

  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    if (Array.isArray(rows)) {
      return rows.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null
      );
    }
  }

  return [];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
};

const toStringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const listSubscriptions = async (
  queryableDb: QueryableDb
): Promise<PlatformBillingSubscriptionListItem[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        s.organization_id,
        organization.name as organization_name,
        p.name as plan_name,
        s.status,
        s.current_period_end
      from billing_subscriptions s
      inner join organization on organization.id = s.organization_id
      inner join billing_plans p on p.id = s.plan_id
      order by s.created_at desc
      limit 50
    `)
  );

  return rows.map((row) => {
    const status = normalizeBillingStatus(toStringValue(row.status));

    return {
      currentPeriodEnd: toIsoString(row.current_period_end),
      hasAccess: hasBillableAccess(status),
      organizationId: toStringValue(row.organization_id),
      organizationName: toStringValue(row.organization_name, "Sem nome"),
      planName: toStringValue(row.plan_name, "Sem plano"),
      status,
    };
  });
};

const listInvoices = async (
  queryableDb: QueryableDb
): Promise<PlatformBillingInvoiceListItem[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        organization.name as organization_name,
        i.status,
        i.total_cents,
        i.created_at
      from billing_invoices i
      inner join organization on organization.id = i.organization_id
      order by i.created_at desc
      limit 50
    `)
  );

  return rows.map((row) => ({
    createdAt: toIsoString(row.created_at),
    organizationName: toStringValue(row.organization_name, "Sem nome"),
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
        (select count(*) from billing_subscriptions where status in ('trialing', 'active', 'past_due')) as active_access_subscriptions,
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
