import "server-only";

import { db } from "@polaris/db";
import { platformSupportCases } from "@polaris/db/schema";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { type SQL, sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toRows,
} from "./internal/query-results";
import { recordPlatformAuditEvent } from "./platform-admin";

const SUPPORT_CASE_LIMIT = 20;

export type PlatformSupportCaseKind = "data_subject_request" | "support";

export interface CreatePlatformSupportCaseInput {
  createdByPlatformAdminId: string;
  customerUserId?: string | null;
  kind: PlatformSupportCaseKind;
  organizationId?: string | null;
  reason: string;
}

export interface PlatformSupportCase {
  closedAt: string | null;
  createdAt: string | null;
  createdByPlatformAdminId: string | null;
  customerUserId: string | null;
  id: string;
  kind: PlatformSupportCaseKind;
  organizationId: string | null;
  requesterVerifiedAt: string | null;
  resolution: string | null;
  status: "closed" | "in_review" | "open";
  updatedAt: string | null;
}

export interface UpdatePlatformSupportCaseInput {
  actorPlatformAdminId: string;
  caseId: string;
  requesterVerified: boolean;
  resolution?: string | null;
  status: "closed" | "in_review";
}

interface SupportCaseTx {
  execute: (query: SQL) => Promise<unknown> | unknown;
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
}

interface TransactionalDb {
  transaction: <Result>(
    callback: (tx: SupportCaseTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

export interface ListPlatformSupportCasesInput {
  customerUserId?: string | null;
  organizationId?: string | null;
}

const requireTarget = (input: ListPlatformSupportCasesInput): void => {
  if (!(input.customerUserId || input.organizationId)) {
    throw new Error("Platform support case requires a target.");
  }
};

const isPlatformSupportCaseKind = (
  value: string
): value is PlatformSupportCaseKind =>
  value === "support" || value === "data_subject_request";

const isPlatformSupportCaseStatus = (
  value: string
): value is UpdatePlatformSupportCaseInput["status"] =>
  value === "in_review" || value === "closed";

const assertCustomerBelongsToOrganization = async (
  tx: SupportCaseTx,
  input: ListPlatformSupportCasesInput
): Promise<void> => {
  if (!(input.customerUserId && input.organizationId)) {
    return;
  }

  const rows = toRows(
    await tx.execute(sql`
      select 1
      from "member"
      where organization_id = ${input.organizationId}
        and user_id = ${input.customerUserId}
      limit 1
    `)
  );

  if (rows.length === 0) {
    throw new Error(
      "Platform support case customer user does not belong to organization."
    );
  }
};

export const createPlatformSupportCase = async (
  input: CreatePlatformSupportCaseInput,
  transactionalDb?: TransactionalDb
): Promise<void> => {
  const reason = input.reason.trim();

  if (!(reason.length > 0 && reason.length <= 1000)) {
    throw new Error(
      "Platform support case requires a reason up to 1000 characters."
    );
  }

  if (!isPlatformSupportCaseKind(input.kind)) {
    throw new Error("Platform support case kind is invalid.");
  }

  requireTarget(input);

  const create = async (tx: SupportCaseTx): Promise<void> => {
    await assertCustomerBelongsToOrganization(tx, input);

    await tx.insert(platformSupportCases).values({
      createdByPlatformAdminId: input.createdByPlatformAdminId,
      customerUserId: input.customerUserId ?? null,
      kind: input.kind,
      organizationId: input.organizationId ?? null,
      reason,
    });

    await recordPlatformAuditEvent(tx, {
      action: "support_case.created",
      actorPlatformAdminId: input.createdByPlatformAdminId,
      metadata: {
        hasCustomerUserId: Boolean(input.customerUserId),
        hasOrganizationId: Boolean(input.organizationId),
        kind: input.kind,
      },
      subjectId: input.organizationId ?? input.customerUserId ?? null,
      subjectType: "support_case",
    });
  };

  if (transactionalDb) {
    await transactionalDb.transaction(create);
    return;
  }

  await withPlatformAdminContext(input.createdByPlatformAdminId, (tx) =>
    create(tx as unknown as SupportCaseTx)
  );
};

const getRequiredResolution = (
  resolution: string | null | undefined
): string => {
  const normalized = resolution?.trim() ?? "";

  if (!(normalized.length > 0 && normalized.length <= 1000)) {
    throw new Error(
      "Closed platform support cases require a resolution up to 1000 characters."
    );
  }

  return normalized;
};

const updatePlatformSupportCaseInTransaction = async (
  input: UpdatePlatformSupportCaseInput,
  tx: SupportCaseTx
): Promise<void> => {
  if (!isPlatformSupportCaseStatus(input.status)) {
    throw new Error("Platform support case status is invalid.");
  }

  const resolution =
    input.status === "closed" ? getRequiredResolution(input.resolution) : null;
  const caseRows = toRows(
    await tx.execute(sql`
      select kind
      from platform_support_cases
      where id = ${input.caseId}
      limit 1
      for update
    `)
  );
  const kind = toNullableString(caseRows[0]?.kind);

  if (!(kind && isPlatformSupportCaseKind(kind))) {
    throw new Error("Platform support case was not found.");
  }

  if (kind === "data_subject_request" && !input.requesterVerified) {
    throw new Error(
      "Data-subject requests require manual requester verification."
    );
  }

  const updatedRows = toRows(
    await tx.execute(sql`
      update platform_support_cases
      set
        status = ${input.status},
        requester_verified_at = case
          when ${input.requesterVerified} then coalesce(requester_verified_at, now())
          else requester_verified_at
        end,
        resolution = case
          when ${input.status} = 'closed' then ${resolution}
          else resolution
        end,
        closed_at = case
          when ${input.status} = 'closed' then coalesce(closed_at, now())
          else null
        end,
        updated_at = now()
      where id = ${input.caseId}
        and status <> 'closed'
      returning id
    `)
  );

  if (updatedRows.length === 0) {
    throw new Error("Platform support case is already closed.");
  }

  await recordPlatformAuditEvent(tx, {
    action: "support_case.updated",
    actorPlatformAdminId: input.actorPlatformAdminId,
    metadata: {
      kind,
      requesterVerified: input.requesterVerified,
      status: input.status,
    },
    subjectId: input.caseId,
    subjectType: "support_case",
  });
};

export const updatePlatformSupportCase = async (
  input: UpdatePlatformSupportCaseInput,
  transactionalDb?: TransactionalDb
): Promise<void> => {
  if (!isPlatformSupportCaseStatus(input.status)) {
    throw new Error("Platform support case status is invalid.");
  }

  if (input.status === "closed") {
    getRequiredResolution(input.resolution);
  }

  if (transactionalDb) {
    await transactionalDb.transaction((tx) =>
      updatePlatformSupportCaseInTransaction(input, tx)
    );
    return;
  }

  await withPlatformAdminContext(input.actorPlatformAdminId, (tx) =>
    updatePlatformSupportCaseInTransaction(
      input,
      tx as unknown as SupportCaseTx
    )
  );
};

const getSupportCasesWhereClause = (
  input: ListPlatformSupportCasesInput
): SQL => {
  requireTarget(input);

  if (input.customerUserId && input.organizationId) {
    return sql`where organization_id = ${input.organizationId} and customer_user_id = ${input.customerUserId}`;
  }

  if (input.organizationId) {
    return sql`where organization_id = ${input.organizationId}`;
  }

  return sql`where customer_user_id = ${input.customerUserId}`;
};

export const listPlatformSupportCases = async (
  input: ListPlatformSupportCasesInput,
  queryableDb: QueryableDb = db as unknown as QueryableDb
): Promise<PlatformSupportCase[]> => {
  const whereClause = getSupportCasesWhereClause(input);
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        id,
        created_by_platform_admin_id,
        organization_id,
        customer_user_id,
        kind,
        status,
        requester_verified_at,
        resolution,
        closed_at,
        created_at,
        updated_at
      from platform_support_cases
      ${whereClause}
      order by created_at desc
      limit ${SUPPORT_CASE_LIMIT}
    `)
  );

  return rows.flatMap((row) => {
    const kind = toNullableString(row.kind);
    const status = toNullableString(row.status);

    if (
      !(kind && isPlatformSupportCaseKind(kind)) ||
      (status !== "open" && status !== "in_review" && status !== "closed")
    ) {
      return [];
    }

    return [
      {
        closedAt: toIsoString(row.closed_at),
        createdAt: toIsoString(row.created_at),
        createdByPlatformAdminId: toNullableString(
          row.created_by_platform_admin_id
        ),
        customerUserId: toNullableString(row.customer_user_id),
        id: toNullableString(row.id) ?? "",
        kind,
        organizationId: toNullableString(row.organization_id),
        requesterVerifiedAt: toIsoString(row.requester_verified_at),
        resolution: toNullableString(row.resolution),
        status,
        updatedAt: toIsoString(row.updated_at),
      },
    ];
  });
};

export const listPlatformSupportCasesForAdmin = async (
  platformAdminId: string,
  input: ListPlatformSupportCasesInput
): Promise<PlatformSupportCase[]> =>
  withPlatformAdminContext(platformAdminId, (queryableDb) =>
    listPlatformSupportCases(input, queryableDb)
  );
