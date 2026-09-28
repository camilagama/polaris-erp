import "server-only";

import {
  platformAdminEnrollments,
  platformAdminGrants,
  platformAdmins,
  platformAuditEvents,
} from "@polaris/db/schema";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  toIsoString,
  toNullableString,
  toRows,
} from "./internal/query-results";

type PlatformAdminRole = "owner" | "operator" | "support";

export interface PlatformAuditEventInput {
  action: string;
  actorAdminUserId?: string | null;
  actorPlatformAdminId?: string | null;
  metadata?: Record<string, unknown>;
  subjectId?: string | null;
  subjectType: string;
}

export interface BootstrapPlatformAdminInput {
  adminUserId: string;
  expiresAt: Date;
  grantedByPlatformAdminId?: string | null;
  reason: string;
  role: PlatformAdminRole;
}

export interface GrantPlatformAdminAccessInput {
  actorAdminUserId: string;
  actorPlatformAdminId: string;
  expiresAt: Date;
  reason: string;
  role: PlatformAdminRole;
  targetAdminUserId: string;
}

export interface CreatePlatformAdminEnrollmentInput {
  actorAdminUserId: string;
  actorPlatformAdminId: string;
  email: string;
  enrollmentExpiresAt: Date;
  grantExpiresAt: Date;
  reason: string;
  role: PlatformAdminRole;
}

export interface CreatePlaywrightPlatformAdminEnrollmentInput {
  email: string;
  enrollmentExpiresAt: Date;
  grantExpiresAt: Date;
  role: PlatformAdminRole;
}

interface PlatformAdminEnrollmentWriteInput
  extends Omit<
    CreatePlatformAdminEnrollmentInput,
    "actorAdminUserId" | "actorPlatformAdminId"
  > {
  actorAdminUserId: string | null;
  actorPlatformAdminId: string | null;
}

export interface RevokePlatformAdminGrantInput {
  actorAdminUserId: string;
  actorPlatformAdminId: string;
  grantId: string;
  reason: string;
}

export interface PlatformAdminGrantSummary {
  adminUserId: string;
  expiresAt: string | null;
  grantId: string;
  platformAdminId: string;
  reason: string;
  revokedAt: string | null;
  role: PlatformAdminRole;
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

const normalizeAdminEmail = (email: string): string =>
  email.trim().toLowerCase();

export const hasActivePlatformAdminEnrollment = async (
  email: string
): Promise<boolean> => {
  const enrollment = await withInternalJobContext(
    "platform_admin_admission",
    (tx) =>
      tx
        .select({ id: platformAdminEnrollments.id })
        .from(platformAdminEnrollments)
        .where(
          and(
            eq(platformAdminEnrollments.email, normalizeAdminEmail(email)),
            isNull(platformAdminEnrollments.claimedAt),
            gt(platformAdminEnrollments.enrollmentExpiresAt, new Date())
          )
        )
        .limit(1)
  );

  return enrollment.length === 1;
};

export const admitPlatformAdminSession = async (
  adminUserId: string
): Promise<void> =>
  withInternalJobContext("platform_admin_admission", async (tx) => {
    const activeGrantRows = toRows(
      await tx.execute(sql`
        select pa.id
        from platform_admins pa
        inner join platform_admin_grants pag on pag.platform_admin_id = pa.id
        where pa.admin_user_id = ${adminUserId}
          and pa.status = 'active'
          and pag.revoked_at is null
          and pag.expires_at > now()
        limit 1
      `)
    );

    if (activeGrantRows.length > 0) {
      return;
    }

    const enrollmentRows = toRows(
      await tx.execute(sql`
        select pae.id, pae.role, pae.reason, pae.grant_expires_at
        from platform_admin_enrollments pae
        inner join admin_users au on au.email = pae.email
        where au.id = ${adminUserId}
          and pae.claimed_at is null
          and pae.enrollment_expires_at > now()
        for update
      `)
    );
    const enrollment = enrollmentRows[0];

    if (!enrollment) {
      throw new Error("Admin identity does not have an active enrollment.");
    }

    const existingAdminRows = toRows(
      await tx.execute(sql`
        select id, status
        from platform_admins
        where admin_user_id = ${adminUserId}
        for update
      `)
    );
    const existingAdmin = existingAdminRows[0];

    if (existingAdmin && existingAdmin.status !== "active") {
      throw new Error(
        "Disabled platform admins cannot claim a new enrollment."
      );
    }

    const platformAdminRows = existingAdmin
      ? [existingAdmin]
      : toRows(
          await tx.execute(sql`
            insert into platform_admins (admin_user_id, status)
            values (${adminUserId}, 'active')
            returning id
          `)
        );
    const platformAdminId = toNullableString(platformAdminRows[0]?.id);
    const role = toNullableString(enrollment.role);
    const enrollmentId = toNullableString(enrollment.id);
    const reason = toNullableString(enrollment.reason);
    const grantExpiresAt = enrollment.grant_expires_at;

    if (
      !(platformAdminId && role && enrollmentId && reason && grantExpiresAt)
    ) {
      throw new Error("Admin enrollment is incomplete.");
    }

    await tx.execute(sql`
      insert into platform_admin_grants (
        platform_admin_id,
        role,
        reason,
        expires_at
      ) values (
        ${platformAdminId},
        ${role},
        ${reason},
        ${grantExpiresAt}
      )
    `);
    await tx.execute(sql`
      update platform_admin_enrollments
      set claimed_at = now(), updated_at = now()
      where id = ${enrollmentId}
        and claimed_at is null
    `);
    await recordPlatformAuditEvent(tx as unknown as InsertableDb, {
      action: "platform_admin.enrollment_claimed",
      actorAdminUserId: adminUserId,
      actorPlatformAdminId: platformAdminId,
      metadata: { enrollmentId, reason, role },
      subjectId: platformAdminId,
      subjectType: "platform_admin",
    });
  });

const bootstrapPlatformAdminInTransaction = async (
  input: BootstrapPlatformAdminInput,
  tx: InsertableDb
): Promise<string> => {
  const platformAdminId = crypto.randomUUID();

  await tx.insert(platformAdmins).values({
    id: platformAdminId,
    adminUserId: input.adminUserId,
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
    actorAdminUserId: input.adminUserId,
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
    actorAdminUserId: input.actorAdminUserId ?? null,
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

const ADMIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requireAdminEmail = (email: string): string => {
  const normalized = normalizeAdminEmail(email);

  if (!ADMIN_EMAIL_PATTERN.test(normalized)) {
    throw new Error("Platform admin enrollment requires a valid email.");
  }

  return normalized;
};

const createPlatformAdminEnrollmentInTransaction = async (
  input: PlatformAdminEnrollmentWriteInput,
  tx: GrantTx,
  auditAction: string
): Promise<string> => {
  const email = requireAdminEmail(input.email);
  const reason = requireGrantReason(input.reason);
  requireFutureExpiry(input.enrollmentExpiresAt);
  requireFutureExpiry(input.grantExpiresAt);

  const enrollmentRows = toRows(
    await tx.execute(sql`
      insert into platform_admin_enrollments (
        email,
        role,
        reason,
        enrollment_expires_at,
        grant_expires_at
      ) values (
        ${email},
        ${input.role},
        ${reason},
        ${input.enrollmentExpiresAt},
        ${input.grantExpiresAt}
      )
      on conflict (email) do update
      set
        role = excluded.role,
        reason = excluded.reason,
        enrollment_expires_at = excluded.enrollment_expires_at,
        grant_expires_at = excluded.grant_expires_at,
        updated_at = now()
      where platform_admin_enrollments.claimed_at is null
      returning id
    `)
  );
  const enrollmentId = toNullableString(enrollmentRows[0]?.id);

  if (!enrollmentId) {
    throw new Error(
      "This email already claimed an admin enrollment. Renew its grant from the existing admin record."
    );
  }

  await recordPlatformAuditEvent(tx, {
    action: auditAction,
    actorAdminUserId: input.actorAdminUserId,
    actorPlatformAdminId: input.actorPlatformAdminId,
    metadata: {
      email,
      enrollmentExpiresAt: input.enrollmentExpiresAt.toISOString(),
      grantExpiresAt: input.grantExpiresAt.toISOString(),
      reason,
      role: input.role,
    },
    subjectId: enrollmentId,
    subjectType: "platform_admin_enrollment",
  });

  return enrollmentId;
};

export const createPlatformAdminEnrollment = (
  input: CreatePlatformAdminEnrollmentInput,
  transactionalDb?: GrantTransactionDb
): Promise<string> => {
  if (transactionalDb) {
    return transactionalDb.transaction((tx) =>
      createPlatformAdminEnrollmentInTransaction(
        input,
        tx,
        "platform_admin.enrollment_created"
      )
    );
  }

  return withInternalJobContext("platform_admin_grant_management", (tx) =>
    createPlatformAdminEnrollmentInTransaction(
      input,
      tx as unknown as GrantTx,
      "platform_admin.enrollment_created"
    )
  );
};

export const createPlaywrightPlatformAdminEnrollment = (
  input: CreatePlaywrightPlatformAdminEnrollmentInput,
  transactionalDb?: GrantTransactionDb
): Promise<string> => {
  const enrollmentInput: PlatformAdminEnrollmentWriteInput = {
    ...input,
    actorAdminUserId: null,
    actorPlatformAdminId: null,
    reason: "Playwright admin E2E bootstrap",
  };

  if (transactionalDb) {
    return transactionalDb.transaction((tx) =>
      createPlatformAdminEnrollmentInTransaction(
        enrollmentInput,
        tx,
        "platform_admin.e2e_enrollment_created"
      )
    );
  }

  return withInternalJobContext("platform_admin_grant_management", (tx) =>
    createPlatformAdminEnrollmentInTransaction(
      enrollmentInput,
      tx as unknown as GrantTx,
      "platform_admin.e2e_enrollment_created"
    )
  );
};

const createPlatformAdminGrantInTransaction = async (
  input: GrantPlatformAdminAccessInput,
  tx: GrantTx
): Promise<string> => {
  const reason = requireGrantReason(input.reason);
  requireFutureExpiry(input.expiresAt);

  const createdRows = toRows(
    await tx.execute(sql`
      insert into platform_admins (admin_user_id, status)
      values (${input.targetAdminUserId}, 'active')
      on conflict (admin_user_id) do update
      set admin_user_id = platform_admins.admin_user_id
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
    actorAdminUserId: input.actorAdminUserId,
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
    actorAdminUserId: input.actorAdminUserId,
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
        pa.admin_user_id,
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
    const adminUserId = toNullableString(row.admin_user_id);

    if (
      !(
        grantId &&
        platformAdminId &&
        adminUserId &&
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
        adminUserId,
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
