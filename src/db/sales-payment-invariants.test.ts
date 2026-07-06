import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const migrationsDir = join(projectRoot, "src/db/migrations");

const readSqlMigrations = () =>
  readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
    .join("\n");

describe("sales payment database invariants", () => {
  it("requires card sales to declare who pays the fee", () => {
    const schema = readFileSync(join(projectRoot, "src/db/schema.ts"), "utf8");
    const migrations = readSqlMigrations();

    expect(schema).toContain("sales_card_fee_payer_required");
    expect(schema).toContain("paymentMethod} <> 'card'");
    expect(schema).toContain("paymentFeePayer} in ('seller', 'customer')");
    expect(migrations).toContain(
      'ADD CONSTRAINT "sales_card_fee_payer_required"'
    );
    expect(migrations).toContain(
      "Card sales with not_applicable fee payer must be resolved"
    );
  });
});
