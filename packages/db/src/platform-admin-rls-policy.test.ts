import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260713090000_platform_admin_rls_validation.sql"
);
const grantExpiryMigrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260714250000_platform_admin_grant_expiry.sql"
);
const platformTablesRlsMigrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260714251000_platform_admin_tables_rls.sql"
);

describe("platform admin RLS policy migration", () => {
  it("validates active grants instead of trusting a non-empty setting", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("has_active_platform_admin");
    expect(migration).toContain("platform_admin_grants");
    expect(migration).toContain("pa.status = 'active'");
    expect(migration).not.toContain(
      "nullif(current_setting('app.platform_admin_id', true), '') IS NOT NULL"
    );
  });

  it("requires expiry for new grants and ignores legacy permanent grants", async () => {
    const migration = await readFile(grantExpiryMigrationPath, "utf8");

    expect(migration).toContain("pag.expires_at > now()");
    expect(migration).not.toContain("pag.expires_at IS NULL");
    expect(migration).toContain('CHECK ("expires_at" IS NOT NULL) NOT VALID');
  });

  it("forces RLS on platform admin tables", async () => {
    const migration = await readFile(platformTablesRlsMigrationPath, "utf8");

    for (const table of [
      "platform_admins",
      "platform_admin_grants",
      "platform_audit_events",
      "platform_support_notes",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`
      );
      expect(migration).toContain(
        `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`
      );
    }

    expect(migration).toContain("platform_admin_bootstrap");
    expect(migration).toContain("auth_audit");
    expect(migration).toContain("public.has_active_platform_admin()");
    expect(migration).toContain("platform_admin_grant_management");
    expect(migration).toContain(
      "\"id\"::text = nullif(current_setting('app.platform_admin_id', true), '')"
    );
    expect(migration).toContain(
      "\"platform_admin_id\"::text = nullif(current_setting('app.platform_admin_id', true), '')"
    );
    expect(migration).toContain("platform_audit_events_authorized_insert");
    expect(migration).toContain(
      "\"actor_user_id\" = nullif(current_setting('app.user_id', true), '')"
    );
  });
});
