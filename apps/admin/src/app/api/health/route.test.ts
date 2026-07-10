import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns sanitized admin health status without cache", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const payload = (await response.json()) as {
      checks: { runtime: { ok: boolean } };
      ok: boolean;
      service: string;
      timestamp: string;
    };

    expect(payload.ok).toBe(true);
    expect(payload.service).toBe("polaris-admin");
    expect(payload.checks.runtime.ok).toBe(true);
    expect(new Date(payload.timestamp).toString()).not.toBe("Invalid Date");
  });
});
