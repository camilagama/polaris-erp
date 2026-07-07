import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("tenant database context", () => {
  it("sets organization id before running tenant queries in a transaction", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute };
    const { db } = await import("@/db");
    const { withTenantContext } = await import("@/db/tenant-context");

    vi.mocked(db.transaction).mockImplementation(async (callback) =>
      callback(tx as never)
    );

    const result = await withTenantContext("org_123", (tenantTx) => {
      expect(tenantTx).toBe(tx);
      return "ok";
    });

    expect(result).toBe("ok");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain(
      "app.organization_id"
    );
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("org_123");
  });

  it("sets tenant context with transaction-local scope", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { setTenantContext } = await import("@/db/tenant-context");

    await setTenantContext({ execute } as never, "org_456");

    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("true");
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("org_456");
  });
});
