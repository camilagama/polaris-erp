import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("sessions.id database invariant", () => {
  it("declares sessions.id as unique in schema and migration", () => {
    const schema = readFileSync(join(projectRoot, "src/db/schema.ts"), "utf8");
    const migration = readFileSync(
      join(
        projectRoot,
        "src/db/migrations/20260706140932_groovy_tarantula.sql"
      ),
      "utf8"
    );

    expect(schema).toContain(
      'uniqueIndex("sessions_id_unique_idx").on(table.id)'
    );
    expect(migration).toContain('CREATE UNIQUE INDEX "sessions_id_unique_idx"');
    expect(migration).toContain(
      "Duplicate sessions.id values must be resolved"
    );
  });
});
