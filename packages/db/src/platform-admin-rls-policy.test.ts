import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260713090000_platform_admin_rls_validation.sql"
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
});
