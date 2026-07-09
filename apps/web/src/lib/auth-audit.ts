import "server-only";

import { recordActorAuditEvent } from "@/lib/audit-log";

interface AuthHookContext {
  body?: unknown;
  path?: string;
}

interface AuthSessionHookPayload {
  activeOrganizationId?: unknown;
  id?: string;
  userId?: string;
}

export const recordAuthLoginAuditEvent = async ({
  context,
  session,
}: {
  context: AuthHookContext | null;
  session: AuthSessionHookPayload;
}) => {
  if (typeof session.activeOrganizationId !== "string") {
    return;
  }

  await recordActorAuditEvent({
    actorUserId: session.userId,
    metadata: {
      path: context?.path ?? null,
      provider: context?.body
        ? (context.body as { provider?: unknown }).provider
        : null,
    },
    organizationId: session.activeOrganizationId,
    subjectId: session.id,
    subjectType: "session",
    type: "auth.login",
  });
};
