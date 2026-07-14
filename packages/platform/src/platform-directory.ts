import "server-only";

import { db } from "@polaris/db";
import { type SQL, sql } from "drizzle-orm";
import {
  toIsoString,
  toNumber,
  toRows,
  toStringValue,
} from "./internal/query-results";

const LIST_LIMIT = 50;
const REDACTED_EMAIL = "[redacted]";

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

interface PlatformOrganizationCounts {
  members: number;
  products: number;
  sales: number;
}

export interface PlatformOrganizationListItem {
  counts: PlatformOrganizationCounts;
  createdAt: string | null;
  id: string;
  primaryMemberEmail: string | null;
  status: string;
  updatedAt: string | null;
}

interface PlatformOrganizationMember {
  createdAt: string | null;
  email: string;
  name: string;
  providerIds: string[];
  role: string;
  userId: string;
}

export interface PlatformOrganizationDetail
  extends PlatformOrganizationListItem {
  members: PlatformOrganizationMember[];
  sessionSummary: PlatformSessionSummary;
}

export interface PlatformUserListItem {
  createdAt: string | null;
  email: string;
  id: string;
  latestSessionAt: string | null;
  name: string;
  organizationCount: number;
  providerIds: string[];
  sessionCount: number;
}

interface PlatformUserOrganization {
  createdAt: string | null;
  id: string;
  role: string;
  status: string;
}

interface PlatformSessionSummary {
  count: number;
  latestCreatedAt: string | null;
  latestExpiresAt: string | null;
}

export interface PlatformUserDetail extends PlatformUserListItem {
  organizations: PlatformUserOrganization[];
  sessionSummary: PlatformSessionSummary;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeSearch = (query: string | undefined): string | null => {
  const trimmed = query?.trim();

  return trimmed ? trimmed.slice(0, 80) : null;
};

export const redactEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");

  if (!(localPart && domain)) {
    return REDACTED_EMAIL;
  }

  return `${localPart.at(0) ?? "*"}***@${domain}`;
};

const getOrganizationSearchClause = (query: string | null): SQL =>
  query
    ? sql`where o.id = ${query} or exists (
        select 1
        from member search_member
        join users search_user on search_user.id = search_member.user_id
        where search_member.organization_id = o.id
          and search_user.email ilike ${`%${query}%`}
      )`
    : sql``;

const getUserSearchClause = (query: string | null): SQL =>
  query
    ? sql`where u.name ilike ${`%${query}%`} or u.email ilike ${`%${query}%`} or u.id = ${query}`
    : sql``;

const mapOrganizationRow = (
  row: Record<string, unknown>
): PlatformOrganizationListItem => ({
  counts: {
    members: toNumber(row.member_count),
    products: toNumber(row.product_count),
    sales: toNumber(row.sale_count),
  },
  createdAt: toIsoString(row.created_at),
  id: toStringValue(row.id),
  primaryMemberEmail:
    toStringValue(row.owner_email) || toStringValue(row.fallback_member_email)
      ? redactEmail(
          toStringValue(row.owner_email) ||
            toStringValue(row.fallback_member_email)
        )
      : null,
  status: toStringValue(row.status, "unknown"),
  updatedAt: toIsoString(row.updated_at),
});

const mapUserRow = (row: Record<string, unknown>): PlatformUserListItem => ({
  createdAt: toIsoString(row.created_at),
  email: redactEmail(toStringValue(row.email)),
  id: toStringValue(row.id),
  latestSessionAt: toIsoString(row.latest_session_at),
  name: toStringValue(row.name, "Sem nome"),
  organizationCount: toNumber(row.organization_count),
  providerIds: toStringArray(row.provider_ids),
  sessionCount: toNumber(row.session_count),
});

export const listPlatformOrganizations = async (
  query?: string,
  queryableDb: QueryableDb = db
): Promise<PlatformOrganizationListItem[]> => {
  const search = normalizeSearch(query);
  const searchClause = getOrganizationSearchClause(search);
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        o.id,
        o.status,
        o.created_at,
        o.updated_at,
        min(u.email) filter (where m.role = 'owner') as owner_email,
        min(u.email) as fallback_member_email,
        count(distinct m.id) as member_count,
        count(distinct p.id) as product_count,
        count(distinct s.id) as sale_count
      from organization o
      left join member m on m.organization_id = o.id
      left join users u on u.id = m.user_id
      left join products p on p.organization_id = o.id
      left join sales s on s.organization_id = o.id
      ${searchClause}
      group by o.id, o.status, o.created_at, o.updated_at
      order by o.created_at desc
      limit ${LIST_LIMIT}
    `)
  );

  return rows.map(mapOrganizationRow);
};

export const getPlatformOrganizationDetail = async (
  organizationId: string,
  queryableDb: QueryableDb = db
): Promise<PlatformOrganizationDetail | null> => {
  const [organizationRow] = toRows(
    await queryableDb.execute(sql`
      select
        o.id,
        o.status,
        o.created_at,
        o.updated_at,
        min(u.email) filter (where m.role = 'owner') as owner_email,
        min(u.email) as fallback_member_email,
        count(distinct m.id) as member_count,
        count(distinct p.id) as product_count,
        count(distinct s.id) as sale_count
      from organization o
      left join member m on m.organization_id = o.id
      left join users u on u.id = m.user_id
      left join products p on p.organization_id = o.id
      left join sales s on s.organization_id = o.id
      where o.id = ${organizationId}
      group by o.id, o.status, o.created_at, o.updated_at
    `)
  );

  if (!organizationRow) {
    return null;
  }

  const [memberRows, sessionRows] = await Promise.all([
    queryableDb.execute(sql`
      select
        u.id as user_id,
        u.name,
        u.email,
        m.role,
        m.created_at,
        coalesce(array_remove(array_agg(distinct a.provider_id), null), '{}') as provider_ids
      from member m
      join users u on u.id = m.user_id
      left join accounts a on a.user_id = u.id
      where m.organization_id = ${organizationId}
      group by u.id, u.name, u.email, m.role, m.created_at
      order by m.created_at desc
      limit ${LIST_LIMIT}
    `),
    queryableDb.execute(sql`
      select
        count(*) as session_count,
        max(created_at) as latest_created_at,
        max(expires_at) as latest_expires_at
      from sessions
      where active_organization_id = ${organizationId}
    `),
  ]);

  const [sessionRow = {}] = toRows(sessionRows);

  return {
    ...mapOrganizationRow(organizationRow),
    members: toRows(memberRows).map((row) => ({
      createdAt: toIsoString(row.created_at),
      email: redactEmail(toStringValue(row.email)),
      name: toStringValue(row.name, "Sem nome"),
      providerIds: toStringArray(row.provider_ids),
      role: toStringValue(row.role, "operator"),
      userId: toStringValue(row.user_id),
    })),
    sessionSummary: {
      count: toNumber(sessionRow.session_count),
      latestCreatedAt: toIsoString(sessionRow.latest_created_at),
      latestExpiresAt: toIsoString(sessionRow.latest_expires_at),
    },
  };
};

export const listPlatformUsers = async (
  query?: string,
  queryableDb: QueryableDb = db
): Promise<PlatformUserListItem[]> => {
  const search = normalizeSearch(query);
  const searchClause = getUserSearchClause(search);
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        u.id,
        u.name,
        u.email,
        u.created_at,
        count(distinct m.organization_id) as organization_count,
        count(distinct se.id) as session_count,
        max(se.created_at) as latest_session_at,
        coalesce(array_remove(array_agg(distinct a.provider_id), null), '{}') as provider_ids
      from users u
      left join member m on m.user_id = u.id
      left join sessions se on se.user_id = u.id
      left join accounts a on a.user_id = u.id
      ${searchClause}
      group by u.id, u.name, u.email, u.created_at
      order by latest_session_at desc nulls last, u.created_at desc
      limit ${LIST_LIMIT}
    `)
  );

  return rows.map(mapUserRow);
};

export const getPlatformUserDetail = async (
  userId: string,
  queryableDb: QueryableDb = db
): Promise<PlatformUserDetail | null> => {
  const [userRow] = toRows(
    await queryableDb.execute(sql`
      select
        u.id,
        u.name,
        u.email,
        u.created_at,
        count(distinct m.organization_id) as organization_count,
        count(distinct se.id) as session_count,
        max(se.created_at) as latest_session_at,
        coalesce(array_remove(array_agg(distinct a.provider_id), null), '{}') as provider_ids
      from users u
      left join member m on m.user_id = u.id
      left join sessions se on se.user_id = u.id
      left join accounts a on a.user_id = u.id
      where u.id = ${userId}
      group by u.id, u.name, u.email, u.created_at
    `)
  );

  if (!userRow) {
    return null;
  }

  const [organizationRows, sessionRows] = await Promise.all([
    queryableDb.execute(sql`
      select
        o.id,
        o.status,
        m.role,
        m.created_at
      from member m
      join organization o on o.id = m.organization_id
      where m.user_id = ${userId}
      order by m.created_at desc
      limit ${LIST_LIMIT}
    `),
    queryableDb.execute(sql`
      select
        count(*) as session_count,
        max(created_at) as latest_created_at,
        max(expires_at) as latest_expires_at
      from sessions
      where user_id = ${userId}
    `),
  ]);
  const [sessionRow = {}] = toRows(sessionRows);

  return {
    ...mapUserRow(userRow),
    organizations: toRows(organizationRows).map((row) => ({
      createdAt: toIsoString(row.created_at),
      id: toStringValue(row.id),
      role: toStringValue(row.role, "operator"),
      status: toStringValue(row.status, "unknown"),
    })),
    sessionSummary: {
      count: toNumber(sessionRow.session_count),
      latestCreatedAt: toIsoString(sessionRow.latest_created_at),
      latestExpiresAt: toIsoString(sessionRow.latest_expires_at),
    },
  };
};
