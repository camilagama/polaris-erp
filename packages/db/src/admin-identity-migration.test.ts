import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  join(
    import.meta.dirname,
    "migrations",
    "20260715120000_admin_identity_isolation.sql"
  ),
  "utf8"
);

describe("admin identity migration", () => {
  it("refuses to detach existing platform administrators silently", () => {
    expect(migrationSource).toContain("platform_admins must be empty");
  });

  it("creates isolated admin identity and enrollment tables", () => {
    expect(migrationSource).toContain('CREATE TABLE "admin_users"');
    expect(migrationSource).toContain('CREATE TABLE "admin_sessions"');
    expect(migrationSource).toContain('CREATE TABLE "admin_accounts"');
    expect(migrationSource).toContain('CREATE TABLE "admin_verifications"');
    expect(migrationSource).toContain(
      'CREATE TABLE "platform_admin_enrollments"'
    );
  });
});
