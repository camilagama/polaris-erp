import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  assertAdminRateLimitMock,
  retryPlatformOutboxEventMock,
  revalidatePathMock,
  requirePlatformAdminMock,
} = vi.hoisted(() => ({
  assertAdminRateLimitMock: vi.fn(),
  retryPlatformOutboxEventMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
}));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdmin: requirePlatformAdminMock,
}));

vi.mock("@polaris/platform-auth/admin-rate-limit", () => ({
  assertAdminRateLimit: assertAdminRateLimitMock,
}));

vi.mock("@polaris/platform/events", () => ({
  retryPlatformOutboxEvent: retryPlatformOutboxEventMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const createFormData = (eventId = "event-1", reason = "provider recovered") => {
  const formData = new FormData();
  formData.set("eventId", eventId);
  formData.set("reason", reason);
  return formData;
};

describe("retryOutboxEventAction", () => {
  it("requires event id before retrying an outbox event", async () => {
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });

    const { retryOutboxEventAction } = await import("./actions");

    await expect(retryOutboxEventAction(createFormData(" "))).rejects.toThrow(
      "Missing required field: eventId"
    );

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(retryPlatformOutboxEventMock).not.toHaveBeenCalled();
  });

  it("requires a reason before retrying an outbox event", async () => {
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });

    const { retryOutboxEventAction } = await import("./actions");

    await expect(
      retryOutboxEventAction(createFormData("event-1", " "))
    ).rejects.toThrow("Missing required field: reason");

    expect(assertAdminRateLimitMock).not.toHaveBeenCalled();
    expect(retryPlatformOutboxEventMock).not.toHaveBeenCalled();
  });

  it("rate limits and delegates retry through the platform module", async () => {
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });
    assertAdminRateLimitMock.mockResolvedValueOnce(undefined);
    retryPlatformOutboxEventMock.mockResolvedValueOnce(true);

    const { retryOutboxEventAction } = await import("./actions");

    await expect(
      retryOutboxEventAction(createFormData())
    ).resolves.toBeUndefined();

    expect(requirePlatformAdminMock).toHaveBeenCalledWith({
      minimumRole: "owner",
    });
    expect(assertAdminRateLimitMock).toHaveBeenCalledWith({
      action: "outbox.retry",
      actorUserId: "user-1",
      targetId: "event-1",
    });
    expect(retryPlatformOutboxEventMock).toHaveBeenCalledWith({
      actorPlatformAdminId: "platform-admin-1",
      actorUserId: "user-1",
      eventId: "event-1",
      reason: "provider recovered",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/events");
  });

  it("does not revalidate events when no outbox retry occurred", async () => {
    revalidatePathMock.mockClear();
    requirePlatformAdminMock.mockResolvedValueOnce({
      platformAdminId: "platform-admin-1",
      userId: "user-1",
    });
    assertAdminRateLimitMock.mockResolvedValueOnce(undefined);
    retryPlatformOutboxEventMock.mockResolvedValueOnce(false);

    const { retryOutboxEventAction } = await import("./actions");

    await expect(
      retryOutboxEventAction(createFormData())
    ).resolves.toBeUndefined();

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
