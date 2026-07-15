import "server-only";

import {
  platformAdminGrants,
  platformAdmins,
  platformAuditEvents,
} from "@polaris/db/schema";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import { sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toRows,
} from "./internal/query-results";

type PlatformAdminRole = "owner" | "operator" | "support";

export interface PlatformAuditEventInput {
  action: string;
  actorPlatformAdminId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  subjectId?: string | null;
  subjectType: string;
}

export interface BootstrapPlatformAdminInput {
  expiresAt: Date;
  grantedByPlatformAdminId?: string | null;
  reason: string;
  role: PlatformAdminRole;
  userId: string;
}

export interface GrantPlatformAdminAccessInput {
  actorPlatformAdminId: string;
  actorUserId: string;
  expiresAt: Date;
  reason: string;
  role: PlatformAdminRole;
  targetUserId: string;
}

export interface RevokePlatformAdminGrantInput {
  actorPlatformAdminId: string;
  actorUserId: string;
  grantId: string;
  reason: string;
}

export interface PlatformAdminGrantSummary {
  expiresAt: string | null;
  grantId: string;
  platformAdminId: string;
  reason: string;
  revokedAt: string | null;
  role: PlatformAdminRole;
  userId: string;
}

interface InsertValues {
  values: (value: Record<string, unknown>) => unknown;
}

interface InsertableDb {
  insert: (table: unknown) => InsertValues;
}

interface TransactionalDb {
  transaction: <Result>(
    callback: (tx: InsertableDb) => Result | Promise<Result>
  ) => Promise<Result>;
}

interface GrantTransactionDb {
  transaction: <Result>(
    callback: (tx: GrantTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

interface GrantTx extends InsertableDb {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown> | unknown;
}

interface QueryableDb {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}

const bootstrapPlatformAdminInTransaction = async (
  input: BootstrapPlatformAdminInput,
  tx: InsertableDb
): Promise<string> => {
  const platformAdminId = crypto.randomUUID();

  await tx.insert(platformAdmins).values({
    id: platformAdminId,
    userId: input.userId,
  });

  await tx.insert(platformAdminGrants).values({
    expiresAt: input.expiresAt,
    grantedByPlatformAdminId: input.grantedByPlatformAdminId ?? null,
    platformAdminId,
    reason: input.reason,
    role: input.role,
  });

  await recordPlatformAuditEvent(tx, {
    action: "platform_admin.bootstrap",
    actorPlatformAdminId: input.grantedByPlatformAdminId ?? null,
    actorUserId: input.userId,
    metadata: {
      reason: input.reason,
      role: input.role,
    },
    subjectId: platformAdminId,
    subjectType: "platform_admin",
  });

  return platformAdminId;
};

export const recordPlatformAuditEvent = async (
  db: InsertableDb,
  input: PlatformAuditEventInput
): Promise<void> => {
  await db.insert(platformAuditEvents).values({
    action: input.action,
    actorPlatformAdminId: input.actorPlatformAdminId ?? null,
    actorUserId: input.actorUserId ?? null,
    metadata: input.metadata ?? {},
    subjectId: input.subjectId ?? null,
    subjectType: input.subjectType,
  });
};

export const bootstrapPlatformAdmin = (
  input: BootstrapPlatformAdminInput,
  transactionalDb?: TransactionalDb
): Promise<string> => {
  if (input.reason.trim().length === 0) {
    throw new Error("Platform admin bootstrap requires a reason.");
  }

  if (
    Number.isNaN(input.expiresAt.getTime()) ||
    input.expiresAt.getTime() <= Date.now()
  ) {
    throw new Error(
      "Platform admin bootstrap requires a future grant expiration."
    );
  }

  if (transactionalDb) {
    return transactionalDb.transaction((tx) =>
      bootstrapPlatformAdminInTransaction(input, tx)
    );
  }

  return withInternalJobContext("platform_admin_bootstrap", (tx) =>
    bootstrapPlatformAdminInTransaction(input, tx as unknown as InsertableDb)
  );
};

const requireGrantReason = (reason: string): string => {
  const normalized = reason.trim();

  if (!(normalized.length > 0 && normalized.length <= 240)) {
    throw new Error(
      "Platform admin grant requires a reason up to 240 characters."
    );
  }

  return normalized;
};

const requireFutureExpiry = (expiresAt: Date): void => {
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("Platform admin grant requires a future expiration.");
  }
};

const createPlatformAdminGrantInTransaction = async (
  input: GrantPlatformAdminAccessInput,
  tx: GrantTx
): Promise<string> => {
  const reason = requireGrantReason(input.reason);
  requireFutureExpiry(input.expiresAt);

  const createdRows = toRows(
    await tx.execute(sql`
      insert into platform_admins (user_id, status)
      values (${input.targetUserId}, 'active')
      on conflict (user_id) do update
      set user_id = platform_admins.user_id
      returning id
    `)
  );
  const createdPlatformAdminId = createdRows[0]?.id;
  const platformAdminId =
    typeof createdPlatformAdminId === "string"
      ? createdPlatformAdminId
      : (() => {
          throw new Error("Platform admin target lookup is required.");
        })();

  const grantRows = toRows(
    await tx.execute(sql`
      insert into platform_admin_grants (
        platform_admin_id,
        role,
        granted_by_platform_admin_id,
        reason,
        expires_at
      ) values (
        ${platformAdminId},
        ${input.role},
        ${input.actorPlatformAdminId},
        ${reason},
        ${input.expiresAt}
      )
      returning id
    `)
  );
  const grantId = grantRows[0]?.id;

  if (typeof grantId !== "string") {
    throw new Error("Platform admin grant was not created.");
  }

  await recordPlatformAuditEvent(tx, {
    action: "platform_admin.granted",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorUserId: input.actorUserId,
    metadata: {
      expiresAt: input.expiresAt.toISOString(),
      reason,
      role: input.role,
    },
    subjectId: grantId,
    subjectType: "platform_admin_grant",
  });

  return grantId;
};

export const grantPlatformAdminAccess = (
  input: GrantPlatformAdminAccessInput,
  transactionalDb?: GrantTransactionDb
): Promise<string> => {
  requireGrantReason(input.reason);
  requireFutureExpiry(input.expiresAt);

  if (transactionalDb) {
    return transactionalDb.transaction((tx) =>
      createPlatformAdminGrantInTransaction(input, tx)
    );
  }

  return withInternalJobContext("platform_admin_grant_management", (tx) =>
    createPlatformAdminGrantInTransaction(input, tx as unknown as GrantTx)
  );
};

const revokePlatformAdminGrantInTransaction = async (
  input: RevokePlatformAdminGrantInput,
  tx: GrantTx
): Promise<void> => {
  const reason = requireGrantReason(input.reason);
  const revokedRows = toRows(
    await tx.execute(sql`
      update platform_admin_grants
      set revoked_at = now(), updated_at = now()
      where id = ${input.grantId}
        and revoked_at is null
      returning platform_admin_id
    `)
  );

  if (revokedRows.length === 0) {
    throw new Error("Platform admin grant is not active.");
  }

  await recordPlatformAuditEvent(tx, {
    action: "platform_admin.grant_revoked",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorUserId: input.actorUserId,
    metadata: { reason },
    subjectId: input.grantId,
    subjectType: "platform_admin_grant",
  });
};

export const revokePlatformAdminGrant = async (
  input: RevokePlatformAdminGrantInput,
  transactionalDb?: GrantTransactionDb
): Promise<void> => {
  requireGrantReason(input.reason);

  if (transactionalDb) {
    await transactionalDb.transaction((tx) =>
      revokePlatformAdminGrantInTransaction(input, tx)
    );
    return;
  }

  await withInternalJobContext("platform_admin_grant_management", (tx) =>
    revokePlatformAdminGrantInTransaction(input, tx as unknown as GrantTx)
  );
};

const isPlatformAdminRole = (value: string): value is PlatformAdminRole =>
  value === "owner" || value === "operator" || value === "support";

export const listPlatformAdminGrants = async (
  queryableDb: QueryableDb
): Promise<PlatformAdminGrantSummary[]> => {
  const rows = toRows(
    await queryableDb.execute(sql`
      select
        pag.id as grant_id,
        pag.platform_admin_id,
        pa.user_id,
        pag.role,
        pag.reason,
        pag.expires_at,
        pag.revoked_at
      from platform_admin_grants pag
      inner join platform_admins pa on pa.id = pag.platform_admin_id
      order by pag.created_at desc
      limit 100
    `)
  );

  return rows.flatMap((row) => {
    const role = toNullableString(row.role);
    const grantId = toNullableString(row.grant_id);
    const platformAdminId = toNullableString(row.platform_admin_id);
    const userId = toNullableString(row.user_id);

    if (
      !(
        grantId &&
        platformAdminId &&
        userId &&
        role &&
        isPlatformAdminRole(role)
      )
    ) {
      return [];
    }

    return [
      {
        expiresAt: toIsoString(row.expires_at),
        grantId,
        platformAdminId,
        reason: toNullableString(row.reason) ?? "",
        revokedAt: toIsoString(row.revoked_at),
        role,
        userId,
      },
    ];
  });
};

export const listPlatformAdminGrantsForOwner = async (): Promise<
  PlatformAdminGrantSummary[]
> =>
  withInternalJobContext("platform_admin_grant_management", (tx) =>
    listPlatformAdminGrants(tx as unknown as QueryableDb)
  );
