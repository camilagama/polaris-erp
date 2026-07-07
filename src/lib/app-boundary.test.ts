import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src", "app");
const DIRECT_DB_IMPORT_PATTERN = /from\s+["']@\/db(?:\/[^"']*)?["']/;
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const APP_PAGINATION_WRAPPER_PATTERN = /src[\\/]app[\\/].*[\\/]pagination\.ts$/;
const APP_SERVER_ACTION_FILE_PATTERN = /src[\\/]app[\\/].*[\\/]actions\.ts$/;
const APP_SERVER_ACTION_TEST_PATTERN =
  /src[\\/]app[\\/].*[\\/]actions\.test\.ts$/;

const listSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }

    if (!TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      continue;
    }

    files.push(path);
  }

  return files;
};

const listRuntimeSourceFiles = (directory: string): string[] =>
  listSourceFiles(directory).filter((file) => !file.includes(".test."));

describe("app runtime boundaries", () => {
  it("keeps database access outside src/app runtime files", () => {
    const offenders = listRuntimeSourceFiles(APP_DIR)
      .filter((file) =>
        DIRECT_DB_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps authenticated shell server actions outside the app route tree", () => {
    const layoutSource = readFileSync(
      join(process.cwd(), "src", "app", "(app)", "layout.tsx"),
      "utf8"
    );

    expect(layoutSource).toContain('from "@/features/auth/actions"');
    expect(layoutSource).not.toContain('from "@/app/(app)/actions"');
  });

  it("keeps pagination server actions outside the app route tree", () => {
    const offenders = listRuntimeSourceFiles(APP_DIR)
      .filter((file) => APP_PAGINATION_WRAPPER_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps server action modules outside the app route tree", () => {
    const offenders = listRuntimeSourceFiles(APP_DIR)
      .filter((file) => APP_SERVER_ACTION_FILE_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps server action tests beside feature actions", () => {
    const offenders = listSourceFiles(APP_DIR)
      .filter((file) => APP_SERVER_ACTION_TEST_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
