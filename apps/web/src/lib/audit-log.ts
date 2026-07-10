import "server-only";

import { auditEvents } from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import type { AppContext } from "@/lib/app-session";

const AUDIT_LOG_TIMEOUT_MS = 500;

interface RecordAuditEventInput {
  context: AppContext;
  metadata?: Record<string, unknown>;
  subjectId?: string | null;
  subjectType: string;
  type: string;
}

interface RecordActorAuditEventInput {
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  organizationId: string;
  subjectId?: string | null;
  subjectType: string;
  type: string;
}

export const recordActorAuditEvent = async ({
  actorUserId = null,
  metadata = {},
  organizationId,
  subjectId = null,
  subjectType,
  type,
}: RecordActorAuditEventInput) => {
  const write = withTenantContext(organizationId, (tx) =>
    tx.insert(auditEvents).values({
      actorUserId,
      metadata,
      organizationId,
      subjectId,
      subjectType,
      type,
    })
  ).catch(() => undefined);

  await Promise.race([
    write,
    new Promise<undefined>((resolve) => {
      setTimeout(resolve, AUDIT_LOG_TIMEOUT_MS);
    }),
  ]);
};

export const recordAuditEvent = async ({
  context,
  metadata = {},
  subjectId = null,
  subjectType,
  type,
}: RecordAuditEventInput) =>
  recordActorAuditEvent({
    actorUserId: context.userId,
    metadata,
    organizationId: context.organizationId,
    subjectId,
    subjectType,
    type,
  });
