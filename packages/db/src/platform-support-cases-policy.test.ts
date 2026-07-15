import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = join(import.meta.dirname, "schema.ts");
const migrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260714252000_platform_support_cases.sql"
);

describe("platform support case policy", () => {
  it("stores manual DSR cases separately from support notes", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('pgTable(\n  "platform_support_cases"');
    expect(schema).toContain('"data_subject_request"');
    expect(schema).toContain('"requester_verified_at"');
    expect(schema).toContain('"closed_at"');
  });

  it("forces platform-admin RLS for support cases", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      'ALTER TABLE "platform_support_cases" ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain(
      'ALTER TABLE "platform_support_cases" FORCE ROW LEVEL SECURITY'
    );
    expect(migration).toContain("public.has_active_platform_admin()");
  });
});
