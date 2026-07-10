import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInternalImportPattern,
  findFilesMatching,
  findRuntimeSourceFiles,
} from "./boundary-test-helpers";

const INTEGRATIONS_DIR = join(process.cwd(), "src", "integrations");
const APP_ROUTE_TREE_IMPORT_PATTERN = createInternalImportPattern(["app"]);
const COMPONENT_IMPORT_PATTERN = createInternalImportPattern(["components"]);
const FEATURE_IMPORT_PATTERN = createInternalImportPattern(["features"]);

describe("integration boundaries", () => {
  it("keeps provider integrations outside the app route tree", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(INTEGRATIONS_DIR),
      APP_ROUTE_TREE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps provider integrations independent from UI components", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(INTEGRATIONS_DIR),
      COMPONENT_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps provider integrations from importing domain features", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(INTEGRATIONS_DIR),
      FEATURE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });
});
