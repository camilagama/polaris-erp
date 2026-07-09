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

describe("listing pagination database indexes", () => {
  it("covers product and sales list seek pagination", () => {
    const schema = readFileSync(join(dbPackageRoot, "src/schema.ts"), "utf8");
    const migrations = readSqlMigrations();

    for (const indexName of [
      "products_active_list_idx",
      "products_archived_list_idx",
      "sales_organization_occurred_on_created_at_id_idx",
    ]) {
      expect(schema).toContain(indexName);
      expect(migrations).toContain(`CREATE INDEX "${indexName}"`);
    }

    expect(schema).toContain("archived_at IS NULL");
    expect(schema).toContain("archived_at IS NOT NULL");
  });
});
