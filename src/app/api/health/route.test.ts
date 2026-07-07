import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/health", () => ({
  checkDatabaseHealth: vi.fn(),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns database status without exposing secrets", async () => {
    const healthModule = await import("@/lib/health");
    const { GET } = await import("@/app/api/health/route");

    vi.mocked(healthModule.checkDatabaseHealth).mockResolvedValueOnce(true);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      checks: {
        database: {
          ok: true,
        },
      },
      ok: true,
    });
    expect(JSON.stringify(payload)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(payload)).not.toContain("SECRET");
  });

  it("returns 503 when the database check fails", async () => {
    const healthModule = await import("@/lib/health");
    const { GET } = await import("@/app/api/health/route");

    vi.mocked(healthModule.checkDatabaseHealth).mockResolvedValueOnce(false);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      checks: {
        database: {
          ok: false,
        },
      },
      ok: false,
    });
    expect(JSON.stringify(payload)).not.toContain("connection refused");
  });

  it("delegates database health checks outside the route handler", () => {
    const source = readFileSync(join(import.meta.dirname, "route.ts"), "utf8");

    expect(source).toContain("checkDatabaseHealth");
    expect(source).not.toContain('from "@/db"');
    expect(source).not.toContain("db.execute");
  });
});
