import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DB_DIR = join(process.cwd(), "src", "db");
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const HIGHER_LAYER_IMPORT_PATTERN =
  /from\s+["']@\/(?:app|components|features)(?:\/|["'])/;

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

describe("database boundaries", () => {
  it("keeps database modules independent from higher application layers", () => {
    const offenders = listSourceFiles(DB_DIR)
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return HIGHER_LAYER_IMPORT_PATTERN.test(source);
      })
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
