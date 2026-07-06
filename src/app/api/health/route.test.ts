import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns database status without exposing secrets", async () => {
    const dbModule = await import("@/db");
    const { GET } = await import("@/app/api/health/route");

    vi.mocked(dbModule.db.execute).mockResolvedValueOnce({ rows: [{ ok: 1 }] });

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
    const dbModule = await import("@/db");
    const { GET } = await import("@/app/api/health/route");

    vi.mocked(dbModule.db.execute).mockRejectedValueOnce(
      new Error("connection refused")
    );

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
});
