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

  it("sets user context with transaction-local scope", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { setUserContext } = await import("@/db/tenant-context");

    await setUserContext({ execute } as never, "user_123");

    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("app.user_id");
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("user_123");
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("true");
  });

  it("sets internal job context with transaction-local scope", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute };
    const { db } = await import("@/db");
    const { withInternalJobContext } = await import("@/db/tenant-context");

    vi.mocked(db.transaction).mockImplementation(async (callback) =>
      callback(tx as never)
    );

    const result = await withInternalJobContext("product_image_reconcile", () =>
      Promise.resolve("ok")
    );

    expect(result).toBe("ok");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain(
      "app.internal_job"
    );
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain(
      "product_image_reconcile"
    );
    expect(JSON.stringify(execute.mock.calls[0]?.[0])).toContain("true");
  });
});
