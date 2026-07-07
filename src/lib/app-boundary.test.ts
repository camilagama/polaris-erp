import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src", "app");
const DIRECT_DB_IMPORT_PATTERN = /from\s+["']@\/db(?:\/schema)?["']/;
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;

const listRuntimeSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listRuntimeSourceFiles(path));
      continue;
    }

    if (!TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      continue;
    }

    if (entry.includes(".test.")) {
      continue;
    }

    files.push(path);
  }

  return files;
};

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
});
