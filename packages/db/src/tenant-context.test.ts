import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("tenant database context", () => {
  it("sets organization id before running tenant queries in a transaction", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute };
    const { db } = await import("./index");
    const { withTenantContext } = await import("./tenant-context");

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

  it("sets tenant, user, platform-admin, and internal-job context locally", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute };
    const { db } = await import("./index");
    const {
      setTenantContext,
      setUserContext,
      withInternalJobContext,
      withPlatformAdminContext,
    } = await import("./tenant-context");

    vi.mocked(db.transaction).mockImplementation(async (callback) =>
      callback(tx as never)
    );

    await setTenantContext(tx as never, "org_456");
    await setUserContext(tx as never, "user_123");
    await withPlatformAdminContext("platform-admin-1", () => Promise.resolve());
    await withInternalJobContext("billing_webhook_reconcile", () =>
      Promise.resolve()
    );

    const executedSql = JSON.stringify(execute.mock.calls);
    expect(executedSql).toContain("app.organization_id");
    expect(executedSql).toContain("app.user_id");
    expect(executedSql).toContain("app.platform_admin_id");
    expect(executedSql).toContain("app.internal_job");
    expect(executedSql).toContain("true");
  });
});
