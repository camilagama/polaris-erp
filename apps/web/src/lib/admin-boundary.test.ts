import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = join(process.cwd(), "..", "..");
const ADMIN_DIR = join(ROOT_DIR, "apps", "admin", "src");
const ADMIN_E2E_DIR = join(ROOT_DIR, "apps", "admin", "tests");
const ADMIN_PLAYWRIGHT_CONFIG_PATH = join(
  ROOT_DIR,
  "apps",
  "admin",
  "playwright.config.ts"
);
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const ADMIN_ALIAS_PREFIX_PATTERN = /^@\//;
const WEB_RELATIVE_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'][^"']*\.\.\/web\//;
const WEB_ALIAS_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](@\/[^"']+)["']/g;

const DECLARED_TEMPORARY_WEB_IMPORTS = new Set<string>();

const findTypeScriptFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...findTypeScriptFiles(path));
      continue;
    }

    if (TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

const resolvesInsideAdmin = (aliasImport: string): boolean => {
  const relativeImport = aliasImport.replace(ADMIN_ALIAS_PREFIX_PATTERN, "");
  const localBasePath = join(ADMIN_DIR, relativeImport);

  return [".ts", ".tsx"].some((extension) =>
    existsSync(`${localBasePath}${extension}`)
  );
};

const findAdminWebAliasImports = (): string[] =>
  findTypeScriptFiles(ADMIN_DIR).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const relativeFile = relative(ROOT_DIR, file).replaceAll("\\", "/");

    return [...source.matchAll(WEB_ALIAS_IMPORT_PATTERN)]
      .map((match) => match[1])
      .filter((aliasImport) => !resolvesInsideAdmin(aliasImport))
      .map((aliasImport) => `${relativeFile} -> ${aliasImport}`);
  });

describe("admin app boundaries", () => {
  it("does not expand temporary imports from the web app source tree", () => {
    const imports = findAdminWebAliasImports();
    const undeclaredImports = imports.filter(
      (importPath) => !DECLARED_TEMPORARY_WEB_IMPORTS.has(importPath)
    );

    expect(undeclaredImports).toEqual([]);
  });

  it("keeps E2E support outside web application internals", () => {
    const e2eFiles = [
      ADMIN_PLAYWRIGHT_CONFIG_PATH,
      ...findTypeScriptFiles(ADMIN_E2E_DIR),
    ];
    const offenders = e2eFiles
      .filter((file) =>
        WEB_RELATIVE_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(ROOT_DIR, file).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });
});
