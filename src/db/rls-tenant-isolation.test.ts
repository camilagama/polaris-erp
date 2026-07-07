import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "src",
    "db",
    "migrations",
    "20260707205000_rls_tenant_isolation.sql"
  ),
  "utf8"
);

const tenantTables = [
  "organization",
  "member",
  "invitation",
  "audit_events",
  "categories",
  "system_settings",
  "products",
  "product_price_changes",
  "product_stock_entries",
  "product_stock_write_offs",
  "sales",
  "sale_items",
  "goals",
] as const;

describe("RLS tenant isolation migration", () => {
  it("enables and forces RLS for every tenant-scoped table", () => {
    for (const table of tenantTables) {
      expect(migration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`
      );
      expect(migration).toContain(
        `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`
      );
    }
  });

  it("uses transaction-local tenant context for tenant policies", () => {
    expect(migration).toContain("current_setting('app.organization_id', true)");
    expect(migration).not.toContain("current_setting('app.organization_id')");
  });

  it("limits global image reconcile access to an explicit internal context", () => {
    expect(migration).toContain("products_internal_image_reconcile_select");
    expect(migration).toContain("current_setting('app.internal_job', true)");
    expect(migration).toContain("product_image_reconcile");
  });
});
