import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("checkDatabaseHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the database responds", async () => {
    const dbModule = await import("@/db");
    const { checkDatabaseHealth } = await import("@/lib/health");

    vi.mocked(dbModule.db.execute).mockResolvedValueOnce({ rows: [{ ok: 1 }] });

    await expect(checkDatabaseHealth()).resolves.toBe(true);
  });

  it("returns false without exposing database errors", async () => {
    const dbModule = await import("@/db");
    const { checkDatabaseHealth } = await import("@/lib/health");

    vi.mocked(dbModule.db.execute).mockRejectedValueOnce(
      new Error("connection refused")
    );

    await expect(checkDatabaseHealth()).resolves.toBe(false);
  });
});
