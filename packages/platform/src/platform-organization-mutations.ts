import "server-only";

import { db } from "@polaris/db";
import { organization } from "@polaris/db/schema";
import { eq } from "drizzle-orm";
import { recordPlatformAuditEvent } from "./platform-admin";

type OrganizationPlatformStatus = "active" | "suspended";

export interface UpdatePlatformOrganizationStatusInput {
  actorPlatformAdminId: string;
  actorUserId: string;
  organizationId: string;
  reason: string;
  status: OrganizationPlatformStatus;
}

interface PlatformOrganizationMutationTx {
  insert: (table: unknown) => {
    values: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  };
  update: (table: unknown) => {
    set: (value: Record<string, unknown>) => {
      where: (condition: unknown) => Promise<unknown> | unknown;
    };
  };
}

interface PlatformOrganizationMutationDb {
  transaction: <Result>(
    callback: (tx: PlatformOrganizationMutationTx) => Result | Promise<Result>
  ) => Promise<Result>;
}

const isOrganizationPlatformStatus = (
  value: string
): value is OrganizationPlatformStatus =>
  value === "active" || value === "suspended";

const getDefaultMutationDb = (): PlatformOrganizationMutationDb =>
  db as unknown as PlatformOrganizationMutationDb;

export const updatePlatformOrganizationStatus = async (
  input: UpdatePlatformOrganizationStatusInput,
  mutationDb: PlatformOrganizationMutationDb = getDefaultMutationDb()
): Promise<void> => {
  const reason = input.reason.trim();

  if (reason.length === 0) {
    throw new Error("Organization status change requires a reason.");
  }

  if (!isOrganizationPlatformStatus(input.status)) {
    throw new Error("Unsupported organization status.");
  }

  await mutationDb.transaction(async (tx) => {
    await tx
      .update(organization)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, input.organizationId));

    await recordPlatformAuditEvent(tx, {
      action: "organization.status_changed",
      actorPlatformAdminId: input.actorPlatformAdminId,
      actorUserId: input.actorUserId,
      metadata: {
        reason,
        status: input.status,
      },
      subjectId: input.organizationId,
      subjectType: "organization",
    });
  });
};
