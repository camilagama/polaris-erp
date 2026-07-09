import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const workspaceRoot = join(projectRoot, "..", "..");
const dbPackageRoot = join(workspaceRoot, "packages/db");
const migrationsDir = join(dbPackageRoot, "src/migrations");

const readSqlMigrations = () =>
  readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
    .join("\n");

describe("tenant-scoped actor database invariants", () => {
  it("requires organization actor fields to reference a member in the same organization", () => {
    const schema = readFileSync(join(dbPackageRoot, "src/schema.ts"), "utf8");
    const migrations = readSqlMigrations();

    for (const constraintName of [
      "audit_events_organization_actor_member_fk",
      "invitation_organization_inviter_member_fk",
      "product_price_changes_organization_actor_member_fk",
      "goals_organization_actor_member_fk",
    ]) {
      expect(schema).toContain(`name: "${constraintName}"`);
      expect(migrations).toContain(`ADD CONSTRAINT "${constraintName}"`);
    }

    expect(migrations).toContain(
      "Tenant-scoped actor references must be resolved"
    );
  });
});
