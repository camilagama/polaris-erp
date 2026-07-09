import { describe, expect, it } from "vitest";

describe("@polaris/db compatibility wrappers", () => {
  it("keeps the web schema wrapper pointed at the shared package", async () => {
    const webSchema = await import("@/db/schema");
    const packageSchema = await import("@polaris/db/schema");

    expect(webSchema.products).toBe(packageSchema.products);
    expect(webSchema.sales).toBe(packageSchema.sales);
    expect(webSchema.platformAdmins).toBe(packageSchema.platformAdmins);
  });

  it("keeps the web tenant-context wrapper pointed at the shared package", async () => {
    const webTenantContext = await import("@/db/tenant-context");
    const packageTenantContext = await import("@polaris/db/tenant-context");

    expect(webTenantContext.withTenantContext).toBe(
      packageTenantContext.withTenantContext
    );
    expect(webTenantContext.withInternalJobContext).toBe(
      packageTenantContext.withInternalJobContext
    );
  });
});
