import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/audit-log", () => ({
  recordActorAuditEvent: vi.fn(),
}));

describe("recordAuthLoginAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not record login audit events without an active organization", async () => {
    const { recordActorAuditEvent } = await import("@/lib/audit-log");
    const { recordAuthLoginAuditEvent } = await import("@/lib/auth-audit");

    await recordAuthLoginAuditEvent({
      context: {
        body: {
          provider: "google",
        },
        path: "/api/auth/callback/google",
      },
      session: {
        activeOrganizationId: null,
        id: "session-1",
        userId: "user-1",
      },
    });

    expect(recordActorAuditEvent).not.toHaveBeenCalled();
  });

  it("records login audit events scoped to the active organization", async () => {
    const { recordActorAuditEvent } = await import("@/lib/audit-log");
    const { recordAuthLoginAuditEvent } = await import("@/lib/auth-audit");

    await recordAuthLoginAuditEvent({
      context: {
        body: {
          provider: "google",
        },
        path: "/api/auth/callback/google",
      },
      session: {
        activeOrganizationId: "org_dg_imports",
        id: "session-1",
        userId: "user-1",
      },
    });

    expect(recordActorAuditEvent).toHaveBeenCalledWith({
      actorUserId: "user-1",
      metadata: {
        path: "/api/auth/callback/google",
        provider: "google",
      },
      organizationId: "org_dg_imports",
      subjectId: "session-1",
      subjectType: "session",
      type: "auth.login",
    });
  });
});
