import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const LIB_DIR = join(process.cwd(), "src", "lib");
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const APP_ROUTE_TREE_IMPORT_PATTERN = /from\s+["']@\/app(?:\/|["'])/;

const listSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }

    if (TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

const listRuntimeSourceFiles = (directory: string): string[] =>
  listSourceFiles(directory).filter((file) => !file.includes(".test."));

describe("lib boundaries", () => {
  it("keeps shared lib runtime from importing the app route tree", () => {
    const offenders = listRuntimeSourceFiles(LIB_DIR)
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return APP_ROUTE_TREE_IMPORT_PATTERN.test(source);
      })
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
