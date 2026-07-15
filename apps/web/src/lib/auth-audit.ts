import "server-only";

import { platformAuditEvents } from "@polaris/db/schema";
import { withInternalJobContext } from "@polaris/db/tenant-context";

interface AuthHookContext {
  body?: unknown;
  path?: string;
}

interface AuthSessionHookPayload {
  activeOrganizationId?: unknown;
  id?: string;
  userId?: string;
}

interface AuthSessionDeleteHookPayload {
  id?: string;
  userId?: string;
}

type AuthAuditAction =
  | "auth.login_failed"
  | "auth.login_succeeded"
  | "auth.logout"
  | "auth.session_revoked";

type AuthFailureReason =
  | "callback_failed"
  | "initiation_failed"
  | "rate_limited";

const getGoogleProvider = (
  context: AuthHookContext | null
): "google" | null => {
  const provider = context?.body
    ? (context.body as { provider?: unknown }).provider
    : null;

  return provider === "google" ? "google" : null;
};

const recordAuthAuditEvent = async ({
  action,
  metadata,
  subjectId = null,
}: {
  action: AuthAuditAction;
  metadata: Record<string, string | null>;
  subjectId?: string | null;
}) => {
  const event = {
    action,
    actorAdminUserId: null,
    metadata,
    subjectId,
    subjectType: "session",
  };

  await withInternalJobContext("auth_audit", (tx) =>
    tx.insert(platformAuditEvents).values(event)
  );
};

export const recordAuthLoginAuditEvent = async ({
  context,
  session,
}: {
  context: AuthHookContext | null;
  session: AuthSessionHookPayload;
}) => {
  await recordAuthAuditEvent({
    action: "auth.login_succeeded",
    metadata: {
      provider: getGoogleProvider(context),
    },
    subjectId: session.id,
  });
};

export const recordAuthLoginFailureAuditEvent = async ({
  reason,
}: {
  reason: AuthFailureReason;
}) =>
  recordAuthAuditEvent({
    action: "auth.login_failed",
    metadata: {
      provider: "google",
      reason,
    },
  });

export const recordAuthSessionAuditEvent = async ({
  context,
  session,
}: {
  context: AuthHookContext | null;
  session: AuthSessionDeleteHookPayload;
}) =>
  recordAuthAuditEvent({
    action:
      context?.path === "/sign-out" ? "auth.logout" : "auth.session_revoked",
    metadata: {},
    subjectId: session.id ?? null,
  });
