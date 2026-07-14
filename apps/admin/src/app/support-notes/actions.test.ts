import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertAdminRateLimitMock,
  createPlatformSupportNoteMock,
  revalidatePathMock,
  requirePlatformAdminMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  createPlatformSupportNoteMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
}));

vi.mock("@polaris/platform/support-notes", () => ({
  createPlatformSupportNote: createPlatformSupportNoteMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

import { createSupportNoteAction } from "./actions";

const createSupportNoteForm = (): FormData => {
  const formData = new FormData();
  formData.set("body", "Customer requested a review.");
  formData.set("organizationId", "org-1");
  formData.set("customerUserId", "user-1");
  return formData;
};

describe("createSupportNoteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdminMock.mockResolvedValue({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });
  });

  it("does not rate limit or write when the actor lacks the support role", async () => {
    requirePlatformAdminMock.mockRejectedValueOnce(new Error("not allowed"));

    await expect(
      createSupportNoteAction(createSupportNoteForm())
    ).rejects.toThrow("not allowed");

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(createPlatformSupportNoteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects a blank body before rate limiting or writing", async () => {
    const formData = createSupportNoteForm();
    formData.set("body", " ");

    await expect(createSupportNoteAction(formData)).rejects.toThrow(
      "Missing required field: body"
    );

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(createPlatformSupportNoteMock).not.toHaveBeenCalled();
  });

  it("does not write or revalidate when the rate limit rejects the action", async () => {
    assertAdminRateLimitMock.mockRejectedValueOnce(new Error("rate limited"));

    await expect(
      createSupportNoteAction(createSupportNoteForm())
    ).rejects.toThrow("rate limited");

    expect(createPlatformSupportNoteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("delegates an authorized note to the platform service and revalidates targets", async () => {
    await createSupportNoteAction(createSupportNoteForm());

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "support",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "support-note.create",
      actorUserId: "user-1",
      targetId: "org-1",
    });
    expect(createPlatformSupportNoteMock).toHaveBeenCalledWith({
      authorPlatformAdminId: "platform-admin-1",
      body: "Customer requested a review.",
      customerUserId: "user-1",
      organizationId: "org-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizations/org-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/users/user-1");
  });
});
