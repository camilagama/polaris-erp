import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertAdminRateLimitMock,
  grantPlatformAdminAccessMock,
  requirePlatformAdminMock,
  revokePlatformAdminGrantMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  grantPlatformAdminAccessMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  revokePlatformAdminGrantMock: vi.fn(),
}));

vi.mock("@polaris/platform/admin", () => ({
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
  grantPlatformAdminAccessAction,
  revokePlatformAdminGrantAction,
} from "./actions";

const createGrantForm = (): FormData => {
  const formData = new FormData();
  formData.set("expiresAt", new Date(Date.now() + 60_000).toISOString());
  formData.set("reason", "Temporary support coverage.");
  formData.set("role", "support");
  formData.set("targetUserId", "support-user");
  return formData;
};

describe("platform admin access actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      userId: "owner-user",
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
        actorUserId: "owner-user",
        role: "support",
        targetUserId: "support-user",
      })
    );
  });

  it("rejects a non-future grant before rate limiting or writing", async () => {
    const formData = createGrantForm();
    formData.set("expiresAt", new Date(0).toISOString());

    await expect(grantPlatformAdminAccessAction(formData)).rejects.toThrow(
      "future expiration"
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
      actorUserId: "owner-user",
      grantId: "grant-1",
      reason: "Coverage ended.",
    });
  });
});
