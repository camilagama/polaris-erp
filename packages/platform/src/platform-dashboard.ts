import "server-only";

import { db } from "@polaris/db";
import { type SQL, sql } from "drizzle-orm";

const RECENT_EVENT_LIMIT = 6;

interface PlatformDashboardSummary {
  activeOrganizations: number;
  disabledPlatformAdmins: number;
  members: number;
  organizations: number;
  platformAdmins: number;
  users: number;
}

interface PlatformDashboardHealth {
  database: boolean;
  productImageReconcileSecret: boolean;
  r2: boolean;
}

interface PlatformDashboardEvent {
  count?: number;
  label: string;
  occurredAt: string | null;
  source: "platform" | "tenant";
}

export interface PlatformDashboardData {
  events: PlatformDashboardEvent[];
  health: PlatformDashboardHealth;
  summary: PlatformDashboardSummary;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
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

const getSummary = async (
  queryableDb: QueryableDb
): Promise<PlatformDashboardSummary> => {
  const [row = {}] = toRows(
    await queryableDb.execute(sql`
      select
        (select count(*) from organization) as organizations,
        (select count(*) from organization where status = 'active') as active_organizations,
        (select count(*) from users) as users,
        (select count(*) from member) as members,
        (select count(*) from platform_admins where status = 'active') as platform_admins,
        (select count(*) from platform_admins where status = 'disabled') as disabled_platform_admins
    `)
  );

  return {
    activeOrganizations: toNumber(row.active_organizations),
    disabledPlatformAdmins: toNumber(row.disabled_platform_admins),
    members: toNumber(row.members),
    organizations: toNumber(row.organizations),
    platformAdmins: toNumber(row.platform_admins),
    users: toNumber(row.users),
  };
};

const getEvents = async (
  queryableDb: QueryableDb
): Promise<PlatformDashboardEvent[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select 'platform' as source, action as label, created_at as occurred_at, null::bigint as count
      from platform_audit_events
      union all
      select 'tenant' as source, type as label, max(created_at) as occurred_at, count(*) as count
      from audit_events
      where created_at >= now() - interval '24 hours'
      group by type
      order by occurred_at desc nulls last
      limit ${RECENT_EVENT_LIMIT}
    `)
  );

  return rows.map((row) => ({
    count: row.count === null ? undefined : toNumber(row.count),
    label: typeof row.label === "string" ? row.label : "unknown",
    occurredAt: toIsoString(row.occurred_at),
    source: row.source === "tenant" ? "tenant" : "platform",
  }));
};

const hasR2Config = (): boolean =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_PUBLIC &&
      process.env.R2_BUCKET_STAGING
  );

const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};

export const getPlatformDashboardData = async (
  queryableDb: QueryableDb = db
): Promise<PlatformDashboardData> => {
  const [database, summary, events] = await Promise.all([
    checkDatabaseHealth(),
    getSummary(queryableDb),
    getEvents(queryableDb),
  ]);

  return {
    events,
    health: {
      database,
      productImageReconcileSecret: Boolean(
        process.env.PRODUCT_IMAGE_RECONCILE_SECRET
      ),
      r2: hasR2Config(),
    },
    summary,
  };
};
