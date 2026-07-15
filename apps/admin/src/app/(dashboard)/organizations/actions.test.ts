import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertAdminRateLimitMock,
  closePlatformOrganizationMock,
  revalidatePathMock,
  requirePlatformAdminMock,
  updatePlatformOrganizationStatusMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  closePlatformOrganizationMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  updatePlatformOrganizationStatusMock: vi.fn(),
}));

vi.mock("@polaris/platform/organization-mutations", () => ({
  closePlatformOrganization: closePlatformOrganizationMock,
  updatePlatformOrganizationStatus: updatePlatformOrganizationStatusMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

import {
  changeOrganizationStatusAction,
  closeOrganizationAction,
} from "./actions";

const createStatusChangeForm = (): FormData => {
  const formData = new FormData();
  formData.set("organizationId", "org-1");
  formData.set("status", "suspended");
  formData.set("reason", "fraud review");
  formData.set("confirm", "on");
  return formData;
};

describe("changeOrganizationStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      adminUserId: "user-1",
    });
  });

  it("does not rate limit or write when the actor lacks the operator role", async () => {
    requirePlatformAdminMock.mockRejectedValueOnce(new Error("not allowed"));

    await expect(
      changeOrganizationStatusAction(createStatusChangeForm())
    ).rejects.toThrow("not allowed");

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(updatePlatformOrganizationStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input before rate limiting or writing", async () => {
    const formData = createStatusChangeForm();
    formData.set("confirm", "off");

    await expect(changeOrganizationStatusAction(formData)).rejects.toThrow(
      "requires confirmation"
    );

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(updatePlatformOrganizationStatusMock).not.toHaveBeenCalled();
  });

  it("does not write or revalidate when the rate limit rejects the action", async () => {
    assertAdminRateLimitMock.mockRejectedValueOnce(new Error("rate limited"));

    await expect(
      changeOrganizationStatusAction(createStatusChangeForm())
    ).rejects.toThrow("rate limited");

    expect(updatePlatformOrganizationStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("delegates an authorized status change and revalidates organization views", async () => {
    await changeOrganizationStatusAction(createStatusChangeForm());

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "operator",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "organization.status.change",
      actorAdminUserId: "user-1",
      targetId: "org-1",
    });
    expect(updatePlatformOrganizationStatusMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      actorAdminUserId: "user-1",
      organizationId: "org-1",
      reason: "fraud review",
      status: "suspended",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizations");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizations/org-1");
  });
});

describe("closeOrganizationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      adminUserId: "user-1",
    });
  });

  it("requires an owner, confirmation and a reason before closing", async () => {
    const formData = new FormData();
    formData.set("organizationId", "org-1");
    formData.set("reason", "Customer requested closure.");
    formData.set("confirm", "on");

    await closeOrganizationAction(formData);

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "owner",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "organization.close",
      actorAdminUserId: "user-1",
      targetId: "org-1",
    });
    expect(closePlatformOrganizationMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      actorAdminUserId: "user-1",
      organizationId: "org-1",
      reason: "Customer requested closure.",
    });
  });
});
