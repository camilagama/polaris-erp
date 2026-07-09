import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_TEXT_FILE_PATTERN = /\.(json|jsonc|mjs|cjs|js|jsx|ts|tsx)$/;
const APP_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](?:@\/|(?:\.\.\/)+apps\/web\/src\/)/;

const findPackageFiles = (directory: string): string[] => {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...findPackageFiles(path));
      continue;
    }

    if (PACKAGE_TEXT_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

describe("package boundaries", () => {
  it("keeps shared packages independent from the web app source tree", () => {
    const packageDir = join(process.cwd(), "..", "..", "packages");
    const offenders = findPackageFiles(packageDir)
      .filter((file) => APP_IMPORT_PATTERN.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });
});
