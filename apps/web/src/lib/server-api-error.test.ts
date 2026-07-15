import { afterEach, describe, expect, it, vi } from "vitest";

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: captureExceptionMock,
}));

import { jsonError } from "@/lib/server-api-error";

describe("jsonError", () => {
  afterEach(() => {
    captureExceptionMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("reports only an allowlisted operational error when a cause exists", async () => {
    vi.stubEnv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const internalCause = new Error(
      "customer@example.com: card token secret-token"
    );

    const response = jsonError("Falha temporaria.", 502, internalCause);

    await expect(response.json()).resolves.toEqual({
      error: "Falha temporaria.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({ source: "api_json_error", status: 502 })
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Operational error reported by api_json_error.",
      }),
      {
        extra: { status: 502 },
        tags: { source: "api_json_error" },
      }
    );

    const serializedCall = JSON.stringify(captureExceptionMock.mock.calls);
    expect(serializedCall).not.toContain("customer@example.com");
    expect(serializedCall).not.toContain("secret-token");
  });
});
