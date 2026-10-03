vi.mock("server-only", () => ({}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertAdminRateLimitMock,
  createPlatformAdminEnrollmentMock,
  grantPlatformAdminAccessMock,
  requirePlatformAdminMock,
  revokePlatformAdminGrantMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  createPlatformAdminEnrollmentMock: vi.fn(),
  grantPlatformAdminAccessMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  revokePlatformAdminGrantMock: vi.fn(),
}));

vi.mock("@polaris/platform/admin", () => ({
  createPlatformAdminEnrollment: createPlatformAdminEnrollmentMock,
  grantPlatformAdminAccess: grantPlatformAdminAccessMock,
  revokePlatformAdminGrant: revokePlatformAdminGrantMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

import {
  createPlatformAdminEnrollmentAction,
  grantPlatformAdminAccessAction,
  revokePlatformAdminGrantAction,
} from "./actions";

const createGrantForm = (): FormData => {
  const formData = new FormData();
  formData.set("expiresAt", "2099-01-01T12:00");
  formData.set("reason", "Temporary support coverage.");
  formData.set("role", "support");
  formData.set("targetAdminUserId", "support-user");
  return formData;
};

describe("platform admin access actions", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      adminUserId: "owner-user",
    });
  });

  it("requires an owner before granting platform access", async () => {
    await grantPlatformAdminAccessAction(createGrantForm());

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "owner",
    });
    expect(grantPlatformAdminAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorPlatformAdminId: "platform-admin-1",
        actorAdminUserId: "owner-user",
        role: "support",
        targetAdminUserId: "support-user",
      })
    );
  });

  it("rejects a non-future grant before rate limiting or writing", async () => {
    const formData = createGrantForm();
    formData.set("expiresAt", "2000-01-01T12:00");

    await expect(grantPlatformAdminAccessAction(formData)).rejects.toThrow(
      "future expiration"
    );

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(grantPlatformAdminAccessMock).not.toHaveBeenCalled();
  });

  it("uses São Paulo time and clips enrollment to a short grant", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
    const form = createGrantForm();
    form.set("expiresAt", "2026-10-03T09:00");
    form.set("email", "support@example.com");
    await createPlatformAdminEnrollmentAction(form);
    expect(createPlatformAdminEnrollmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        grantExpiresAt: new Date("2026-10-03T12:00:00Z"),
        enrollmentExpiresAt: new Date("2026-10-03T12:00:00Z"),
      })
    );
  });

  it("rejects duplicate expiration before rate limiting or writing", async () => {
    const form = createGrantForm();
    form.append("expiresAt", "2099-01-02T12:00");
    await expect(grantPlatformAdminAccessAction(form)).rejects.toThrow(
      "uma única data"
    );
    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(grantPlatformAdminAccessMock).not.toHaveBeenCalled();
  });

  it("requires a reason to revoke a grant", async () => {
    const formData = new FormData();
    formData.set("grantId", "grant-1");
    formData.set("reason", "Coverage ended.");

    await revokePlatformAdminGrantAction(formData);

    expect(revokePlatformAdminGrantMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      actorAdminUserId: "owner-user",
      grantId: "grant-1",
      reason: "Coverage ended.",
    });
  });
});
