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

describe("organization technical identity migration", () => {
  it("normalizes existing customer-controlled organization names to technical values", () => {
    const migrations = readSqlMigrations();

    expect(migrations).toContain('update "organization"');
    expect(migrations).toContain(`"name" = 'Tenant ' || left("id", 8)`);
    expect(migrations).toContain(`"slug" = 'tenant-' || "id"`);
    expect(migrations).toContain(`where "name" <> 'Tenant ' || left("id", 8)`);
  });
});
