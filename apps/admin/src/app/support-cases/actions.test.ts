import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertAdminRateLimitMock,
  createPlatformSupportCaseMock,
  revalidatePathMock,
  requirePlatformAdminMock,
  updatePlatformSupportCaseMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  createPlatformSupportCaseMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  updatePlatformSupportCaseMock: vi.fn(),
}));

vi.mock("@polaris/platform/support-cases", () => ({
  createPlatformSupportCase: createPlatformSupportCaseMock,
  updatePlatformSupportCase: updatePlatformSupportCaseMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

import { createSupportCaseAction, updateSupportCaseAction } from "./actions";

const createSupportCaseForm = (): FormData => {
  const formData = new FormData();
  formData.set("customerUserId", "user-1");
  formData.set("kind", "data_subject_request");
  formData.set("organizationId", "org-1");
  formData.set("reason", "Manual identity verification is pending.");
  return formData;
};

describe("createSupportCaseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      adminUserId: "user-1",
    });
  });

  it("rejects unsupported case kinds before rate limiting or writing", async () => {
    const formData = createSupportCaseForm();
    formData.set("kind", "unknown");

    await expect(createSupportCaseAction(formData)).rejects.toThrow(
      "Unsupported support case kind."
    );

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(createPlatformSupportCaseMock).not.toHaveBeenCalled();
  });

  it("creates an authenticated, rate-limited manual DSR case", async () => {
    await createSupportCaseAction(createSupportCaseForm());

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "support",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "support-case.create",
      actorAdminUserId: "user-1",
      targetId: "org-1",
    });
    expect(createPlatformSupportCaseMock).toHaveBeenCalledWith({
      createdByPlatformAdminId: "platform-admin-1",
      customerUserId: "user-1",
      kind: "data_subject_request",
      organizationId: "org-1",
      reason: "Manual identity verification is pending.",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizations/org-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/users/user-1");
  });

  it("closes a verified DSR with a resolution", async () => {
    const formData = new FormData();
    formData.set("caseId", "case-1");
    formData.set("customerUserId", "user-1");
    formData.set("requesterVerified", "on");
    formData.set("resolution", "Verified request handled manually.");
    formData.set("status", "closed");

    await updateSupportCaseAction(formData);

    expect(updatePlatformSupportCaseMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      caseId: "case-1",
      requesterVerified: true,
      resolution: "Verified request handled manually.",
      status: "closed",
    });
  });
});
