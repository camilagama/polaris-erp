import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createExactInternalImportPattern,
  createInternalImportPattern,
  findFilesMatching,
  findFilesMissingCompanionPattern,
  findRuntimeSourceFiles,
  findSourceFiles,
} from "./boundary-test-helpers";

const FEATURES_DIR = join(process.cwd(), "src", "features");
const APP_ROUTE_TREE_IMPORT_PATTERN = createInternalImportPattern(["app"]);
const COMPONENT_IMPORT_PATTERN = createInternalImportPattern(["components"]);
const DB_IMPORT_PATTERN = createInternalImportPattern(["db"]);
const DIRECT_DB_IMPORT_PATTERN = createExactInternalImportPattern(["db"]);
const DB_SCHEMA_IMPORT_PATTERN = createInternalImportPattern(["db/schema"]);
const TENANT_CONTEXT_IMPORT_PATTERN = createInternalImportPattern([
  "db/tenant-context",
]);
const FEATURE_ACTION_FILE_PATTERN = /src[\\/]features[\\/].*[\\/]actions\.ts$/;

describe("feature boundaries", () => {
  it("keeps domain features from importing the app route tree", () => {
    const offenders = findFilesMatching(
      findSourceFiles(FEATURES_DIR),
      APP_ROUTE_TREE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps domain features from importing UI components", () => {
    const offenders = findFilesMatching(
      findSourceFiles(FEATURES_DIR),
      COMPONENT_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps feature server actions from importing the database layer", () => {
    const actionFiles = findSourceFiles(FEATURES_DIR).filter((file) =>
      FEATURE_ACTION_FILE_PATTERN.test(file)
    );
    const offenders = findFilesMatching(actionFiles, DB_IMPORT_PATTERN);

    expect(offenders).toEqual([]);
  });

  it("keeps feature runtime files from importing the database root directly", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(FEATURES_DIR),
      DIRECT_DB_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps feature runtime schema access behind tenant context helpers", () => {
    const offenders = findFilesMissingCompanionPattern(
      findRuntimeSourceFiles(FEATURES_DIR),
      DB_SCHEMA_IMPORT_PATTERN,
      TENANT_CONTEXT_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });
});
