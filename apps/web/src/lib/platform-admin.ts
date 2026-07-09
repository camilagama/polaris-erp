import "server-only";

import {
  platformAdminGrants,
  platformAdmins,
  platformAuditEvents,
} from "@/db/schema";

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
  grantedByPlatformAdminId?: string | null;
  reason: string;
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
  db: TransactionalDb,
  input: BootstrapPlatformAdminInput
): Promise<string> => {
  if (input.reason.trim().length === 0) {
    throw new Error("Platform admin bootstrap requires a reason.");
  }

  return db.transaction(async (tx) => {
    const platformAdminId = crypto.randomUUID();

    await tx.insert(platformAdmins).values({
      id: platformAdminId,
      userId: input.userId,
    });

    await tx.insert(platformAdminGrants).values({
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
  });
};
