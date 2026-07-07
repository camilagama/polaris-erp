import "server-only";

import { auditEvents } from "@/db/schema";
import { withTenantContext } from "@/db/tenant-context";
import type { AppContext } from "@/lib/app-session";

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
  try {
    await withTenantContext(organizationId, (tx) =>
      tx.insert(auditEvents).values({
        actorUserId,
        metadata,
        organizationId,
        subjectId,
        subjectType,
        type,
      })
    );
  } catch {
    // Audit logging must never make the domain operation fail.
  }
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
