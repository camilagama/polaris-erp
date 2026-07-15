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

describe("active goals database invariants", () => {
  it("allows one active goal per organization and metric", () => {
    const schema = readFileSync(join(dbPackageRoot, "src/schema.ts"), "utf8");
    const migrations = readSqlMigrations();

    expect(schema).toContain("goals_one_active_per_organization_metric_idx");
    expect(schema).toContain("where(sql`status = 'active'`)");
    expect(migrations).toContain(
      'CREATE UNIQUE INDEX "goals_one_active_per_organization_metric_idx"'
    );
  });

  it("prevents terminal goals from returning to active", () => {
    const migrations = readSqlMigrations();

    expect(migrations).toContain("enforce_goal_state_transition");
    expect(migrations).toContain("Completed and expired goals are terminal");
  });
});
