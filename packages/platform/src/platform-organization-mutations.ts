import "server-only";

import { organization } from "@polaris/db/schema";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { eq } from "drizzle-orm";
import { recordPlatformAuditEvent } from "./platform-admin";

type OrganizationPlatformStatus = "active" | "suspended";
type MutationReturningRow = Record<string, unknown>;

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
      where: (condition: unknown) => {
        returning: (
          value: Record<string, unknown>
        ) => Promise<MutationReturningRow[]> | MutationReturningRow[];
      };
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

const updatePlatformOrganizationStatusInTransaction = async (
  input: UpdatePlatformOrganizationStatusInput,
  tx: PlatformOrganizationMutationTx
): Promise<void> => {
  const reason = input.reason.trim();

  if (reason.length === 0) {
    throw new Error("Organization status change requires a reason.");
  }

  if (!isOrganizationPlatformStatus(input.status)) {
    throw new Error("Unsupported organization status.");
  }

  const updatedOrganizations = await tx
    .update(organization)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(organization.id, input.organizationId))
    .returning({ id: organization.id });

  if (updatedOrganizations.length === 0) {
    throw new Error("Organization not found for status change.");
  }

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
};

export const updatePlatformOrganizationStatus = async (
  input: UpdatePlatformOrganizationStatusInput,
  mutationDb?: PlatformOrganizationMutationDb
): Promise<void> => {
  const reason = input.reason.trim();

  if (reason.length === 0) {
    throw new Error("Organization status change requires a reason.");
  }

  if (!isOrganizationPlatformStatus(input.status)) {
    throw new Error("Unsupported organization status.");
  }

  if (mutationDb) {
    await mutationDb.transaction((tx) =>
      updatePlatformOrganizationStatusInTransaction(input, tx)
    );
    return;
  }

  await withPlatformAdminContext(input.actorPlatformAdminId, (tx) =>
    updatePlatformOrganizationStatusInTransaction(
      input,
      tx as unknown as PlatformOrganizationMutationTx
    )
  );
};
