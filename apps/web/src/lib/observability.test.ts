import { describe, expect, it, vi } from "vitest";
import {
  createSafeOperationalError,
  getErrorDigest,
  reportTerminalOutboxFailure,
} from "@/lib/observability";

describe("observability error sanitization", () => {
  it("keeps only the framework digest from an unknown error", () => {
    const error = Object.assign(new Error("card number 4111 1111 1111 1111"), {
      digest: "next-digest-123",
    });

    expect(getErrorDigest(error)).toBe("next-digest-123");
    expect(getErrorDigest({ digest: 123 })).toBeUndefined();
    expect(getErrorDigest("next-digest-123")).toBeUndefined();
  });

  it("creates an operational error without copying the original cause", () => {
    const error = createSafeOperationalError("api_json_error");

    expect(error.message).toBe("Operational error reported by api_json_error.");
    expect(error.message).not.toContain("4111");
  });

  it("reports dead-letter events without payloads or error messages", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    reportTerminalOutboxFailure({
      correlationId: "corr-1",
      eventId: "event-1",
      eventType: "payment.confirmed",
      topic: "asaas.webhook",
    });

    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        correlationId: "corr-1",
        event: "outbox.dead_letter",
        eventId: "event-1",
        eventType: "payment.confirmed",
        topic: "asaas.webhook",
      })
    );
    error.mockRestore();
  });
});
