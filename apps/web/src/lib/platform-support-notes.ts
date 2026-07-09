import "server-only";

import { type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { platformSupportNotes } from "@/db/schema";
import { recordPlatformAuditEvent } from "@/lib/platform-admin";

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

interface InsertableTx {
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
}

interface TransactionalDb {
  transaction: <Result>(
    callback: (tx: InsertableTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

interface QueryableDb {
  execute: (query: SQL) => Promise<unknown>;
}

export interface ListPlatformSupportNotesInput {
  customerUserId?: string | null;
  organizationId?: string | null;
}

const getDefaultTransactionalDb = (): TransactionalDb =>
  db as unknown as TransactionalDb;

const getDefaultQueryableDb = (): QueryableDb => db as unknown as QueryableDb;

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

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return null;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

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

export const createPlatformSupportNote = async (
  input: CreatePlatformSupportNoteInput,
  transactionalDb: TransactionalDb = getDefaultTransactionalDb()
): Promise<void> => {
  const body = input.body.trim();

  if (body.length === 0) {
    throw new Error("Platform support note requires a body.");
  }

  requireTarget(input);

  await transactionalDb.transaction(async (tx) => {
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
  });
};

const getSupportNotesWhereClause = ({
  customerUserId,
  organizationId,
}: ListPlatformSupportNotesInput): SQL => {
  if (customerUserId && organizationId) {
    return sql`where organization_id = ${organizationId} or customer_user_id = ${customerUserId}`;
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
