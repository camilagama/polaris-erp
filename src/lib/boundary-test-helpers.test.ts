import { describe, expect, it } from "vitest";
import {
  createExactInternalImportPattern,
  createInternalImportPattern,
  findFilesMissingCompanionPattern,
} from "./boundary-test-helpers";

const DB_SCHEMA_IMPORT_PATTERN = /@\/db\/schema/;
const TENANT_CONTEXT_IMPORT_PATTERN = /@\/db\/tenant-context/;

describe("boundary test helpers", () => {
  it("matches static, dynamic, and side-effect internal imports", () => {
    const pattern = createInternalImportPattern(["db"]);

    expect('import { db } from "@/db";').toMatch(pattern);
    expect('const dbModule = await import("@/db");').toMatch(pattern);
    expect('import "@/db/schema";').toMatch(pattern);
  });

  it("does not match adjacent internal module names", () => {
    const pattern = createInternalImportPattern(["app", "features"]);

    expect('import { Button } from "@/application/ui";').not.toMatch(pattern);
    expect('const module = await import("@/feature-flags");').not.toMatch(
      pattern
    );
  });

  it("matches only exact internal root imports", () => {
    const pattern = createExactInternalImportPattern(["db"]);

    expect('import { db } from "@/db";').toMatch(pattern);
    expect('const dbModule = await import("@/db");').toMatch(pattern);
    expect('import "@/db/schema";').not.toMatch(pattern);
    expect('import { products } from "@/db/schema";').not.toMatch(pattern);
  });

  it("finds files matching one pattern while missing a companion pattern", () => {
    const files = [
      "src/features/products/server.ts",
      "src/features/products/queries.ts",
    ];

    const offenders = findFilesMissingCompanionPattern(
      files,
      DB_SCHEMA_IMPORT_PATTERN,
      TENANT_CONTEXT_IMPORT_PATTERN,
      {
        "src/features/products/server.ts":
          'import { products } from "@/db/schema";\nimport { withTenantContext } from "@/db/tenant-context";',
        "src/features/products/queries.ts":
          'import { products } from "@/db/schema";',
      }
    );

    expect(offenders).toEqual(["src/features/products/queries.ts"]);
  });
});
