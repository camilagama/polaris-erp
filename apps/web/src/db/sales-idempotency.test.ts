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

describe("sales idempotency database invariant", () => {
  it("requires idempotency keys to be unique per organization when present", () => {
    const schema = readFileSync(join(dbPackageRoot, "src/schema.ts"), "utf8");
    const migrations = readSqlMigrations();

    expect(schema).toContain('idempotencyKey: text("idempotency_key")');
    expect(schema).toContain("sales_organization_idempotency_key_unique_idx");
    expect(schema).toContain("idempotency_key IS NOT NULL");
    expect(migrations).toContain('ADD COLUMN "idempotency_key" text');
    expect(migrations).toContain(
      'CREATE UNIQUE INDEX "sales_organization_idempotency_key_unique_idx"'
    );
    expect(migrations).toContain("WHERE idempotency_key IS NOT NULL");
  });
});
