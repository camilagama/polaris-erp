import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInternalImportPattern,
  findFilesMatching,
  findSourceFiles,
} from "./boundary-test-helpers";

const COMPONENTS_DIR = join(process.cwd(), "src", "components");
const APP_ROUTE_TREE_IMPORT_PATTERN = createInternalImportPattern(["app"]);
const DB_IMPORT_PATTERN = createInternalImportPattern(["db"]);

describe("component boundaries", () => {
  it("keeps components from importing the app route tree", () => {
    const offenders = findFilesMatching(
      findSourceFiles(COMPONENTS_DIR),
      APP_ROUTE_TREE_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps components from importing the database layer", () => {
    const offenders = findFilesMatching(
      findSourceFiles(COMPONENTS_DIR),
      DB_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });
});
