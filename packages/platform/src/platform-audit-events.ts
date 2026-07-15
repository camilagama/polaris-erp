import "server-only";

import { db } from "@polaris/db";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { type SQL, sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toRows,
} from "./internal/query-results";

const PLATFORM_AUDIT_EVENT_LIMIT = 50;

export interface PlatformAuditEventListFilters {
  action?: string;
  subjectId?: string;
  subjectType?: string;
}

export interface PlatformAuditEventListItem {
  action: string;
  actorPlatformAdminId: string | null;
  actorAdminUserId: string | null;
  createdAt: string | null;
  id: string;
  subjectId: string | null;
  subjectType: string;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

const getDefaultQueryableDb = (): QueryableDb => db as unknown as QueryableDb;

const normalizeFilter = (value: string | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed ? trimmed.slice(0, 120) : null;
};

const getWhereClause = (filters: PlatformAuditEventListFilters): SQL => {
  const action = normalizeFilter(filters.action);
  const subjectId = normalizeFilter(filters.subjectId);
  const subjectType = normalizeFilter(filters.subjectType);
  const clauses: SQL[] = [];

  if (action) {
    clauses.push(sql`action = ${action}`);
  }

  if (subjectId) {
    clauses.push(sql`subject_id = ${subjectId}`);
  }

  if (subjectType) {
    clauses.push(sql`subject_type = ${subjectType}`);
  }

  return clauses.length > 0
    ? sql`where ${sql.join(clauses, sql` and `)}`
    : sql``;
};

export const listPlatformAuditEvents = async (
  filters: PlatformAuditEventListFilters = {},
  queryableDb: QueryableDb = getDefaultQueryableDb()
): Promise<PlatformAuditEventListItem[]> => {
  const whereClause = getWhereClause(filters);
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        id,
        action,
        actor_platform_admin_id,
        actor_admin_user_id,
        subject_type,
        subject_id,
        created_at
      from platform_audit_events
      ${whereClause}
      order by created_at desc
      limit ${PLATFORM_AUDIT_EVENT_LIMIT}
    `)
  );

  return rows.map((row) => ({
    action: toNullableString(row.action) ?? "unknown",
    actorPlatformAdminId: toNullableString(row.actor_platform_admin_id),
    actorAdminUserId: toNullableString(row.actor_admin_user_id),
    createdAt: toIsoString(row.created_at),
    id: toNullableString(row.id) ?? "",
    subjectId: toNullableString(row.subject_id),
    subjectType: toNullableString(row.subject_type) ?? "unknown",
  }));
};

export const listPlatformAuditEventsForAdmin = async (
  platformAdminId: string,
  filters: PlatformAuditEventListFilters = {}
): Promise<PlatformAuditEventListItem[]> =>
  withPlatformAdminContext(platformAdminId, (queryableDb) =>
    listPlatformAuditEvents(filters, queryableDb)
  );
