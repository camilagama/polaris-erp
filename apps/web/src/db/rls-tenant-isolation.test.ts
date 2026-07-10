import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "..",
    "..",
    "packages",
    "db",
    "src",
    "migrations",
    "20260707205000_rls_tenant_isolation.sql"
  ),
  "utf8"
);

const billingMigration = readFileSync(
  join(
    process.cwd(),
    "..",
    "..",
    "packages",
    "db",
    "src",
    "migrations",
    "20260710041000_billing_rls_platform_admin.sql"
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

const billingTenantTables = [
  "billing_customers",
  "billing_subscriptions",
  "billing_invoices",
  "billing_payment_attempts",
  "billing_provider_links",
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

  it("enables and forces RLS for tenant-scoped billing tables", () => {
    for (const table of billingTenantTables) {
      expect(billingMigration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`
      );
      expect(billingMigration).toContain(
        `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`
      );
      expect(billingMigration).toContain(
        `"${table}_tenant_or_platform_access"`
      );
    }
  });

  it("allows billing through tenant, platform admin, or billing webhook contexts", () => {
    expect(billingMigration).toContain(
      "current_setting('app.organization_id', true)"
    );
    expect(billingMigration).toContain(
      "current_setting('app.platform_admin_id', true)"
    );
    expect(billingMigration).toContain(
      "current_setting('app.internal_job', true) = 'billing_webhook_reconcile'"
    );
    expect(billingMigration).toContain(
      "organization_platform_admin_billing_select"
    );
  });
});
