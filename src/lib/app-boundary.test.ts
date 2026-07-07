import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInternalImportPattern,
  findFilesMatching,
  findRuntimeSourceFiles,
  findSourceFiles,
} from "./boundary-test-helpers";

const APP_DIR = join(process.cwd(), "src", "app");
const DIRECT_DB_IMPORT_PATTERN = createInternalImportPattern(["db"]);
const APP_PAGINATION_WRAPPER_PATTERN = /src[\\/]app[\\/].*[\\/]pagination\.ts$/;
const APP_SERVER_ACTION_FILE_PATTERN = /src[\\/]app[\\/].*[\\/]actions\.ts$/;
const APP_SERVER_ACTION_TEST_PATTERN =
  /src[\\/]app[\\/].*[\\/]actions\.test\.ts$/;

describe("app runtime boundaries", () => {
  it("keeps database access outside src/app runtime files", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(APP_DIR),
      DIRECT_DB_IMPORT_PATTERN
    );

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
    const offenders = findRuntimeSourceFiles(APP_DIR)
      .filter((file) => APP_PAGINATION_WRAPPER_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps server action modules outside the app route tree", () => {
    const offenders = findRuntimeSourceFiles(APP_DIR)
      .filter((file) => APP_SERVER_ACTION_FILE_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps server action tests beside feature actions", () => {
    const offenders = findSourceFiles(APP_DIR)
      .filter((file) => APP_SERVER_ACTION_TEST_PATTERN.test(file))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
