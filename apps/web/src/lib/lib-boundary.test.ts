import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInternalImportPattern,
  findFilesMatching,
  findRuntimeSourceFiles,
} from "./boundary-test-helpers";

const LIB_DIR = join(process.cwd(), "src", "lib");
const APP_ROUTE_TREE_IMPORT_PATTERN = createInternalImportPattern(["app"]);
const FEATURE_IMPORT_PATTERN = createInternalImportPattern(["features"]);

describe("lib boundaries", () => {
  it("keeps shared lib runtime from importing the app route tree", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(LIB_DIR),
      APP_ROUTE_TREE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps shared lib runtime from importing domain features", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(LIB_DIR),
      FEATURE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });
});
