import "server-only";

import { auditEvents } from "@/db/schema";
import type { AppContext } from "@/lib/app-session";

interface RecordAuditEventInput {
  context: AppContext;
  metadata?: Record<string, unknown>;
  subjectId?: string | null;
  subjectType: string;
  type: string;
}

export const recordAuditEvent = async ({
  context,
  metadata = {},
  subjectId = null,
  subjectType,
  type,
}: RecordAuditEventInput) => {
  try {
    const { db } = await import("@/db");

    await db.insert(auditEvents).values({
      actorUserId: context.userId,
      metadata,
      organizationId: context.organizationId,
      subjectId,
      subjectType,
      type,
    });
  } catch {
    // Audit logging must never make the domain operation fail.
  }
};
