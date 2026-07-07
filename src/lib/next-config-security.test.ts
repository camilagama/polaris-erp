import { describe, expect, it, vi } from "vitest";
import { getSecurityHeaders } from "@/lib/security-headers";

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: vi.fn((config) => config),
}));

describe("next.config security headers", () => {
  it("applies the baseline security headers to every route", async () => {
    const { baseNextConfig } = await import("../../next.config");

    await expect(baseNextConfig.headers?.()).resolves.toEqual([
      {
        headers: getSecurityHeaders(),
        source: "/:path*",
      },
    ]);
  });
});
