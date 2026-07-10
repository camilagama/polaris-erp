import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const workspaceRoot = join(projectRoot, "..", "..");
const dbPackageRoot = join(workspaceRoot, "packages/db");
const migrationsDir = join(dbPackageRoot, "src/migrations");
const salesQueriesPath = join(projectRoot, "src/features/sales/queries.ts");

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

  it("covers text search with trigram indexes and exact sale id lookup", () => {
    const schema = readFileSync(join(dbPackageRoot, "src/schema.ts"), "utf8");
    const migrations = readSqlMigrations();
    const salesQueries = readFileSync(salesQueriesPath, "utf8");

    expect(migrations).toContain("CREATE EXTENSION IF NOT EXISTS pg_trgm");

    for (const indexName of [
      "categories_name_trgm_idx",
      "products_active_name_trgm_idx",
      "products_archived_name_trgm_idx",
      "sales_customer_name_trgm_idx",
    ]) {
      expect(schema).toContain(indexName);
      expect(migrations).toContain(`CREATE INDEX "${indexName}"`);
      expect(migrations).toContain("gin_trgm_ops");
    }

    expect(salesQueries).toContain("UUID_PATTERN.test(normalizedQuery)");
    expect(salesQueries).toContain("eq(sales.id, normalizedQuery)");
    expect(salesQueries).not.toContain("sales.id}::text");
  });
});
