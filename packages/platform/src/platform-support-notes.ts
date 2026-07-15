import "server-only";

import { db } from "@polaris/db";
import { platformSupportNotes } from "@polaris/db/schema";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { type SQL, sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toRows,
} from "./internal/query-results";
import { recordPlatformAuditEvent } from "./platform-admin";

const SUPPORT_NOTE_LIMIT = 20;

export interface CreatePlatformSupportNoteInput {
  authorPlatformAdminId: string;
  body: string;
  customerUserId?: string | null;
  organizationId?: string | null;
}

export interface PlatformSupportNote {
  authorPlatformAdminId: string | null;
  body: string;
  createdAt: string | null;
  customerUserId: string | null;
  id: string;
  organizationId: string | null;
  updatedAt: string | null;
}

interface SupportNoteTx {
  execute: (query: SQL) => Promise<unknown> | unknown;
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
}

interface TransactionalDb {
  transaction: <Result>(
    callback: (tx: SupportNoteTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

export interface ListPlatformSupportNotesInput {
  customerUserId?: string | null;
  organizationId?: string | null;
}

const getDefaultQueryableDb = (): QueryableDb => db as unknown as QueryableDb;

const requireTarget = ({
  customerUserId,
  organizationId,
}: {
  customerUserId?: string | null;
  organizationId?: string | null;
}) => {
  if (!(customerUserId || organizationId)) {
    throw new Error("Platform support note requires a target.");
  }
};

const assertCustomerBelongsToOrganization = async (
  tx: SupportNoteTx,
  {
    customerUserId,
    organizationId,
  }: {
    customerUserId?: string | null;
    organizationId?: string | null;
  }
) => {
  if (!(customerUserId && organizationId)) {
    return;
  }

  const rows = toRows(
    await tx.execute(sql`
      select 1
      from "member"
      where organization_id = ${organizationId}
        and user_id = ${customerUserId}
      limit 1
    `)
  );

  if (rows.length === 0) {
    throw new Error(
      "Platform support note customer user does not belong to organization."
    );
  }
};

export const createPlatformSupportNote = async (
  input: CreatePlatformSupportNoteInput,
  transactionalDb?: TransactionalDb
): Promise<void> => {
  const body = input.body.trim();

  if (body.length === 0) {
    throw new Error("Platform support note requires a body.");
  }

  requireTarget(input);

  const create = async (tx: SupportNoteTx): Promise<void> => {
    await assertCustomerBelongsToOrganization(tx, input);

    await tx.insert(platformSupportNotes).values({
      authorPlatformAdminId: input.authorPlatformAdminId,
      body,
      customerUserId: input.customerUserId ?? null,
      organizationId: input.organizationId ?? null,
    });

    await recordPlatformAuditEvent(tx, {
      action: "support_note.created",
      actorPlatformAdminId: input.authorPlatformAdminId,
      metadata: {
        hasCustomerUserId: Boolean(input.customerUserId),
        hasOrganizationId: Boolean(input.organizationId),
      },
      subjectId: input.organizationId ?? input.customerUserId ?? null,
      subjectType: "support_note",
    });
  };

  if (transactionalDb) {
    await transactionalDb.transaction(create);
    return;
  }

  await withPlatformAdminContext(input.authorPlatformAdminId, (tx) =>
    create(tx as unknown as SupportNoteTx)
  );
};

const getSupportNotesWhereClause = ({
  customerUserId,
  organizationId,
}: ListPlatformSupportNotesInput): SQL => {
  if (customerUserId && organizationId) {
    return sql`where organization_id = ${organizationId} and customer_user_id = ${customerUserId}`;
  }

  if (organizationId) {
    return sql`where organization_id = ${organizationId}`;
  }

  if (customerUserId) {
    return sql`where customer_user_id = ${customerUserId}`;
  }

  throw new Error("Platform support notes list requires a target.");
};

export const listPlatformSupportNotes = async (
  input: ListPlatformSupportNotesInput,
  queryableDb: QueryableDb = getDefaultQueryableDb()
): Promise<PlatformSupportNote[]> => {
  const whereClause = getSupportNotesWhereClause(input);
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        id,
        author_platform_admin_id,
        organization_id,
        customer_user_id,
        body,
        created_at,
        updated_at
      from platform_support_notes
      ${whereClause}
      order by created_at desc
      limit ${SUPPORT_NOTE_LIMIT}
    `)
  );

  return rows.map((row) => ({
    authorPlatformAdminId: toNullableString(row.author_platform_admin_id),
    body: toNullableString(row.body) ?? "",
    createdAt: toIsoString(row.created_at),
    customerUserId: toNullableString(row.customer_user_id),
    id: toNullableString(row.id) ?? "",
    organizationId: toNullableString(row.organization_id),
    updatedAt: toIsoString(row.updated_at),
  }));
};

export const listPlatformSupportNotesForAdmin = async (
  platformAdminId: string,
  input: ListPlatformSupportNotesInput
): Promise<PlatformSupportNote[]> =>
  withPlatformAdminContext(platformAdminId, (queryableDb) =>
    listPlatformSupportNotes(input, queryableDb)
  );
