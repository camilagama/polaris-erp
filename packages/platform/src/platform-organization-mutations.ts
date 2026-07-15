import "server-only";

import { member, organization, sessions } from "@polaris/db/schema";
import { withPlatformAdminContext } from "@polaris/db/tenant-context";
import { enqueueOutboxEvent } from "@polaris/events";
import { eq, sql } from "drizzle-orm";
import { recordPlatformAuditEvent } from "./platform-admin";

type OrganizationPlatformStatus = "active" | "suspended";
type MutationReturningRow = Record<string, unknown>;

export interface UpdatePlatformOrganizationStatusInput {
  actorPlatformAdminId: string;
  actorAdminUserId: string;
  organizationId: string;
  reason: string;
  status: OrganizationPlatformStatus;
}

export interface ClosePlatformOrganizationInput {
  actorPlatformAdminId: string;
  actorAdminUserId: string;
  organizationId: string;
  reason: string;
}

interface ActiveSubscriptionProviderRow extends Record<string, unknown> {
  provider: "asaas" | "manual" | "woovi";
  providerSubscriptionId: string;
  subscriptionId: string;
}

interface PlatformOrganizationMutationTx {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
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

  if (input.status === "suspended") {
    await tx
      .update(sessions)
      .set({
        expiresAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        sql`${sessions.userId} in (
          select ${member.userId}
          from ${member}
          where ${member.organizationId} = ${input.organizationId}
        )`
      );

    await recordPlatformAuditEvent(tx, {
      action: "auth.sessions_revoked",
      actorPlatformAdminId: input.actorPlatformAdminId,
      actorAdminUserId: input.actorAdminUserId,
      metadata: {
        reason: "organization_suspended",
      },
      subjectId: input.organizationId,
      subjectType: "organization",
    });
  }

  await recordPlatformAuditEvent(tx, {
    action: "organization.status_changed",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorAdminUserId: input.actorAdminUserId,
    metadata: {
      reason,
      status: input.status,
    },
    subjectId: input.organizationId,
    subjectType: "organization",
  });
};

const toRows = (result: unknown): Record<string, unknown>[] => {
  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    return Array.isArray(rows)
      ? rows.filter(
          (row): row is Record<string, unknown> =>
            typeof row === "object" && row !== null
        )
      : [];
  }

  return Array.isArray(result)
    ? result.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null
      )
    : [];
};

const toActiveSubscriptionProviderRow = (
  row: Record<string, unknown> | undefined
): ActiveSubscriptionProviderRow | null => {
  if (
    !row ||
    (row.provider !== "asaas" &&
      row.provider !== "woovi" &&
      row.provider !== "manual") ||
    typeof row.providerSubscriptionId !== "string" ||
    typeof row.subscriptionId !== "string"
  ) {
    return null;
  }

  return {
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    subscriptionId: row.subscriptionId,
  };
};

const closePlatformOrganizationInTransaction = async (
  input: ClosePlatformOrganizationInput,
  tx: PlatformOrganizationMutationTx
): Promise<void> => {
  await updatePlatformOrganizationStatusInTransaction(
    { ...input, status: "suspended" },
    tx
  );

  const [activeSubscriptionRow] = toRows(
    await tx.execute(sql`
      select
        subscription.id as "subscriptionId",
        provider_link.provider,
        provider_link.external_id as "providerSubscriptionId"
      from billing_subscriptions as subscription
      inner join billing_provider_links as provider_link
        on provider_link.billing_subscription_id = subscription.id
        and provider_link.entity_type = 'subscription'
      where subscription.organization_id = ${input.organizationId}
        and subscription.status in ('trialing', 'active', 'past_due', 'paused')
        and subscription.cancel_at_period_end = false
      order by subscription.created_at desc
      limit 1
      for update of subscription
    `)
  );
  const subscription = toActiveSubscriptionProviderRow(activeSubscriptionRow);

  if (subscription) {
    await tx.execute(sql`
      update billing_subscriptions
      set cancel_at_period_end = true,
          updated_at = now()
      where id = ${subscription.subscriptionId}
        and organization_id = ${input.organizationId}
        and cancel_at_period_end = false
    `);

    if (subscription.provider !== "manual") {
      await enqueueOutboxEvent(tx, {
        correlationId: `organization-closure:${input.organizationId}`,
        eventType: "subscription.cancel_at_period_end",
        idempotencyKey: `organization-closure-cancel:${input.organizationId}:${subscription.subscriptionId}`,
        payload: {
          provider: subscription.provider,
          providerSubscriptionId: subscription.providerSubscriptionId,
          subscriptionId: subscription.subscriptionId,
        },
        topic: "billing.subscription",
      });
    }
  }

  await recordPlatformAuditEvent(tx, {
    action: "organization.closure_requested",
    actorPlatformAdminId: input.actorPlatformAdminId,
    actorAdminUserId: input.actorAdminUserId,
    metadata: {
      providerCancellationRequested: Boolean(
        subscription && subscription.provider !== "manual"
      ),
      reason: input.reason.trim(),
      subscriptionId: subscription?.subscriptionId ?? null,
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

export const closePlatformOrganization = async (
  input: ClosePlatformOrganizationInput,
  mutationDb?: PlatformOrganizationMutationDb
): Promise<void> => {
  if (input.reason.trim().length === 0) {
    throw new Error("Organization closure requires a reason.");
  }

  if (mutationDb) {
    await mutationDb.transaction((tx) =>
      closePlatformOrganizationInTransaction(input, tx)
    );
    return;
  }

  await withPlatformAdminContext(input.actorPlatformAdminId, (tx) =>
    closePlatformOrganizationInTransaction(
      input,
      tx as unknown as PlatformOrganizationMutationTx
    )
  );
};
