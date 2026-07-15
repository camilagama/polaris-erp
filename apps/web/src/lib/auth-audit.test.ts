import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@polaris/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

const tenantContextMocks = vi.hoisted(() => ({
  withInternalJobContext: vi.fn(),
  withUserContext: vi.fn(),
}));

vi.mock("@polaris/db/tenant-context", () => ({
  withInternalJobContext: tenantContextMocks.withInternalJobContext,
  withUserContext: tenantContextMocks.withUserContext,
}));

type MockFn = ReturnType<typeof vi.fn>;

const resolveMocks = async () => {
  const dbModule = await import("@polaris/db");

  return {
    mockDb: dbModule.db as unknown as {
      insert: MockFn;
    },
  };
};

describe("authentication audit events", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { mockDb } = await resolveMocks();
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });
    tenantContextMocks.withUserContext.mockImplementation(
      async (_userId, callback) => callback(mockDb)
    );
    tenantContextMocks.withInternalJobContext.mockImplementation(
      async (_job, callback) => callback(mockDb)
    );
  });

  it("records successful logins before onboarding without tenant metadata", async () => {
    const { mockDb } = await resolveMocks();
    const { recordAuthLoginAuditEvent } = await import("@/lib/auth-audit");

    await recordAuthLoginAuditEvent({
      context: {
        body: {
          provider: "google",
        },
        path: "/callback/google",
      },
      session: {
        activeOrganizationId: null,
        id: "session-1",
        userId: "user-1",
      },
    });

    expect(mockDb.insert).toHaveBeenCalledOnce();
    expect(tenantContextMocks.withInternalJobContext).toHaveBeenCalledWith(
      "auth_audit",
      expect.any(Function)
    );
    expect(mockDb.insert.mock.results[0]?.value.values).toHaveBeenCalledWith({
      action: "auth.login_succeeded",
      actorAdminUserId: null,
      metadata: {
        provider: "google",
      },
      subjectId: "session-1",
      subjectType: "session",
    });
  });

  it("records only the normalized Google provider for successful logins", async () => {
    const { mockDb } = await resolveMocks();
    const { recordAuthLoginAuditEvent } = await import("@/lib/auth-audit");

    await recordAuthLoginAuditEvent({
      context: {
        body: {
          provider: "untrusted-provider",
        },
      },
      session: {
        id: "session-1",
        userId: "user-1",
      },
    });

    expect(mockDb.insert.mock.results[0]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          provider: null,
        },
      })
    );
  });

  it("records failed Google login attempts without provider error details", async () => {
    const { mockDb } = await resolveMocks();
    const { recordAuthLoginFailureAuditEvent } = await import(
      "@/lib/auth-audit"
    );

    await recordAuthLoginFailureAuditEvent({ reason: "callback_failed" });

    expect(tenantContextMocks.withInternalJobContext).toHaveBeenCalledWith(
      "auth_audit",
      expect.any(Function)
    );
    expect(mockDb.insert.mock.results[0]?.value.values).toHaveBeenCalledWith({
      action: "auth.login_failed",
      actorAdminUserId: null,
      metadata: {
        provider: "google",
        reason: "callback_failed",
      },
      subjectId: null,
      subjectType: "session",
    });
  });

  it("classifies Better Auth sign-out separately from session revocation", async () => {
    const { mockDb } = await resolveMocks();
    const { recordAuthSessionAuditEvent } = await import("@/lib/auth-audit");

    await recordAuthSessionAuditEvent({
      context: { path: "/sign-out" },
      session: { id: "session-1", userId: "user-1" },
    });

    await recordAuthSessionAuditEvent({
      context: { path: "/revoke-session" },
      session: { id: "session-2", userId: "user-1" },
    });

    expect(mockDb.insert.mock.results[0]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.logout", subjectId: "session-1" })
    );
    expect(mockDb.insert.mock.results[1]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.session_revoked",
        subjectId: "session-2",
      })
    );
  });
});
