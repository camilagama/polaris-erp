import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = join(import.meta.dirname, "schema.ts");
const migrationPath = join(
  import.meta.dirname,
  "migrations",
  "20260714213542_lovely_ultimo.sql"
);

describe("individual tenant database policy", () => {
  it("uniquely identifies each provider account and each user membership", () => {
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain("accounts_provider_account_unique_idx");
    expect(schema).toContain("member_user_unique_idx");
    expect(schema).toContain("member_organization_unique_idx");
  });

  it("allows only the owner role for tenant memberships", () => {
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain(`sql\`\${table.role} = 'owner'\``);
  });

  it("stops on legacy violations before enforcing individual-tenant constraints", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("Legacy duplicate provider accounts");
    expect(migration).toContain(
      "Legacy tenant memberships violate one-person-one-organization"
    );
    expect(migration).toContain(
      "Legacy organizations must have exactly one owner"
    );
    expect(migration).toContain("enforce_organization_single_owner");
    expect(migration).toContain("IF TG_TABLE_NAME = 'organization' THEN");
    expect(migration).toContain("IF TG_OP = 'DELETE' THEN");
    expect(migration).not.toContain('ALTER TABLE "event_outbox"');
  });
});
