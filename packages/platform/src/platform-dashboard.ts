import "server-only";

import { formatBusinessDate, shiftBusinessDate } from "@polaris/date";
import { db } from "@polaris/db";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { type SQL, sql } from "drizzle-orm";
import { toIsoString, toNumber, toRows } from "./internal/query-results";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

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
  activity: { date: string; count: number; level: number }[];
  events: PlatformDashboardEvent[];
  health: PlatformDashboardHealth;
  summary: PlatformDashboardSummary;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

export const buildActivityDateRange = (
  referenceDate: Date,
  days: number
): string[] => {
  const today = formatBusinessDate(referenceDate);
  const from = shiftBusinessDate(today, -(days - 1));
  const dates: string[] = [];

  for (let date = from; date <= today; date = shiftBusinessDate(date, 1)) {
    dates.push(date);
  }

  return dates;
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

const getActivityMap = async (
  queryableDb: QueryableDb
): Promise<{ date: string; count: number; level: number }[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select activity_date as date, count(*) as count
      from (
        select date(created_at at time zone ${BUSINESS_TIME_ZONE}) as activity_date
        from audit_events
        where created_at >= now() - interval '365 days'
      ) as daily_events
      group by activity_date
      order by activity_date asc
    `)
  );

  let maxCount = 0;

  const activitiesMap = new Map<string, number>();

  for (const row of rows) {
    const count = toNumber(row.count);
    const dateStr =
      typeof row.date === "string"
        ? row.date
        : (toIsoString(row.date)?.split("T")[0] ?? "");
    if (dateStr) {
      activitiesMap.set(dateStr, count);
      if (count > maxCount) {
        maxCount = count;
      }
    }
  }

  // Ensure 365 days range is always filled
  const activities: { date: string; count: number; level: number }[] = [];

  for (const dateStr of buildActivityDateRange(new Date(), 365)) {
    const count = activitiesMap.get(dateStr) || 0;

    activities.push({
      date: dateStr,
      count,
      level: 0,
    });
  }

  return activities.map((activity) => {
    if (activity.count === 0) {
      return { ...activity, level: 0 };
    }
    if (maxCount === 0) {
      return { ...activity, level: 1 };
    }

    const ratio = activity.count / maxCount;
    let level = 1;
    if (ratio > 0.25) {
      level = 2;
    }
    if (ratio > 0.5) {
      level = 3;
    }
    if (ratio > 0.75) {
      level = 4;
    }

    return { ...activity, level };
  });
};

const hasR2Config = (): boolean =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_FINAL &&
      process.env.R2_BUCKET_STAGING
  );

const checkDatabaseHealth = async (
  queryableDb: QueryableDb
): Promise<boolean> => {
  try {
    await queryableDb.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};

export const getPlatformDashboardData = async (
  queryableDb: QueryableDb = db
): Promise<PlatformDashboardData> => {
  // All queries share the transaction that carries app.platform_admin_id for
  // RLS. A node-postgres client cannot execute multiple queries concurrently.
  const database = await checkDatabaseHealth(queryableDb);
  const summary = await getSummary(queryableDb);
  const events = await getEvents(queryableDb);
  const activity = await getActivityMap(queryableDb);

  return {
    activity,
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

export const getPlatformDashboardDataForAdmin = async (
  platformAdminId: string
): Promise<PlatformDashboardData> =>
  withPlatformAdminContext(platformAdminId, getPlatformDashboardData);
