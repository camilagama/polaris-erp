import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  assertAdminRateLimitMock,
  revalidatePathMock,
  requirePlatformAdminMock,
  updatePlatformBillingSubscriptionStatusMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  updatePlatformBillingSubscriptionStatusMock: vi.fn(),
}));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("@polaris/platform/billing", () => ({
  updatePlatformBillingSubscriptionStatus:
    updatePlatformBillingSubscriptionStatusMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const createFormData = ({
  confirm = "on",
  reason = "payment confirmed manually",
  status = "active",
  subscriptionId = "subscription-1",
}: {
  confirm?: string | null;
  reason?: string;
  status?: string;
  subscriptionId?: string;
} = {}) => {
  const formData = new FormData();
  formData.set("subscriptionId", subscriptionId);
  formData.set("status", status);
  formData.set("reason", reason);

  if (confirm !== null) {
    formData.set("confirm", confirm);
  }

  return formData;
};

describe("changeBillingSubscriptionStatusAction", () => {
  it("requires confirmation before changing billing status", async () => {
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });

    const { changeBillingSubscriptionStatusAction } = await import("./actions");

    await expect(
      changeBillingSubscriptionStatusAction(createFormData({ confirm: null }))
    ).rejects.toThrow("requires confirmation");

    expect(updatePlatformBillingSubscriptionStatusMock).not.toHaveBeenCalled();
  });

  it("rate limits and updates subscription status as an operator action", async () => {
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });
    assertAdminRateLimitMock.mockResolvedValueOnce(undefined);
    updatePlatformBillingSubscriptionStatusMock.mockResolvedValueOnce(
      undefined
    );

    const { changeBillingSubscriptionStatusAction } = await import("./actions");

    await expect(
      changeBillingSubscriptionStatusAction(createFormData())
    ).resolves.toBeUndefined();

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "operator",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "billing.subscription.status.change",
      actorUserId: "user-1",
      targetId: "subscription-1",
    });
    expect(updatePlatformBillingSubscriptionStatusMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      actorUserId: "user-1",
      reason: "payment confirmed manually",
      status: "active",
      subscriptionId: "subscription-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/billing");
  });
});
