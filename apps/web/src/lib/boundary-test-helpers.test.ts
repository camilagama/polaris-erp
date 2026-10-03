import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectModuleSpecifiers,
  createExactInternalImportPattern,
  createInternalImportPattern,
  findDependencyCycles,
  findFilesMissingCompanionPattern,
  findSourceFiles,
  loadTypeScriptConfig,
  resolveTypeScriptModule,
} from "./boundary-test-helpers";

const DB_SCHEMA_IMPORT_PATTERN = /@\/db\/schema/;
const TENANT_CONTEXT_IMPORT_PATTERN = /@\/db\/tenant-context/;

describe("boundary test helpers", () => {
  it("collects static, type-only, side-effect, re-export, and dynamic imports", () => {
    const source = [
      'import { value } from "@/value";',
      'import type { Model } from "@polaris/db/schema";',
      'import "./side-effect";',
      'export { value as renamed } from "./re-export";',
      'export type { Model } from "@polaris/db";',
      'const lazy = import("./lazy");',
      'const lazyWithOptions = import("./lazy-with-options", { with: { type: "json" } });',
      'type Button = import("@polaris/ui/components/ui/button").ButtonProps;',
      'import legacy = require("./legacy");',
      'const required = require("./required");',
    ].join("\n");

    expect(collectModuleSpecifiers(source, "fixture.ts")).toEqual([
      "@/value",
      "@polaris/db/schema",
      "./side-effect",
      "./re-export",
      "@polaris/db",
      "./lazy",
      "./lazy-with-options",
      "@polaris/ui/components/ui/button",
      "./legacy",
      "./required",
    ]);
  });

  it("resolves app aliases and public package exports using the app tsconfig", () => {
    const tsconfigPath = join(process.cwd(), "tsconfig.json");
    const config = loadTypeScriptConfig(tsconfigPath);
    const sourceFile = join(
      process.cwd(),
      "src",
      "lib",
      "package-boundary.test.ts"
    );

    expect(
      resolveTypeScriptModule("@/lib/env", sourceFile, config.options)
    ).toBe(join(process.cwd(), "src", "lib", "env.ts"));
    expect(
      resolveTypeScriptModule(
        "@polaris/ui/components/ui/button",
        sourceFile,
        config.options
      )
    ).toBe(
      join(
        process.cwd(),
        "..",
        "..",
        "packages",
        "ui",
        "src",
        "components",
        "ui",
        "button.tsx"
      )
    );
  });

  it("reports directed dependency cycles once", () => {
    expect(
      findDependencyCycles({
        "@polaris/a": ["@polaris/b"],
        "@polaris/b": ["@polaris/a", "@polaris/c"],
        "@polaris/c": ["@polaris/d"],
        "@polaris/d": ["@polaris/c"],
        "@polaris/e": [],
      })
    ).toEqual([
      ["@polaris/a", "@polaris/b", "@polaris/a"],
      ["@polaris/c", "@polaris/d", "@polaris/c"],
    ]);
  });

  it("finds all TypeScript source file extensions used by the workspace", () => {
    const sourceDirectory = mkdtempSync(join(tmpdir(), "polaris-ts-source-"));

    try {
      mkdirSync(join(sourceDirectory, "nested"));
      for (const fileName of [
        "plain.ts",
        "component.tsx",
        "module.mts",
        "legacy.cts",
      ]) {
        writeFileSync(join(sourceDirectory, fileName), "export {};", "utf8");
      }
      writeFileSync(
        join(sourceDirectory, "nested", "nested.mts"),
        "export {};",
        "utf8"
      );
      writeFileSync(join(sourceDirectory, "ignored.js"), "export {};", "utf8");

      expect(
        findSourceFiles(sourceDirectory)
          .map((filePath) => filePath.slice(sourceDirectory.length + 1))
          .sort()
      ).toEqual([
        "component.tsx",
        "legacy.cts",
        "module.mts",
        join("nested", "nested.mts"),
        "plain.ts",
      ]);
    } finally {
      rmSync(sourceDirectory, { force: true, recursive: true });
    }
  });

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
