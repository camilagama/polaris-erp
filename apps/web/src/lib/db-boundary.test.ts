import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInternalImportPattern,
  findFilesMatching,
  findRuntimeSourceFiles,
  findSourceFiles,
} from "./boundary-test-helpers";

const DB_DIR = join(process.cwd(), "src", "db");
const SRC_DIR = join(process.cwd(), "src");
const HIGHER_LAYER_IMPORT_PATTERN = createInternalImportPattern([
  "app",
  "components",
  "features",
]);
const LEGACY_DB_IMPORT_PATTERN = createInternalImportPattern(["db"]);

describe("database boundaries", () => {
  it("keeps database modules independent from higher application layers", () => {
    const offenders = findFilesMatching(
      findSourceFiles(DB_DIR),
      HIGHER_LAYER_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });

  it("keeps new runtime code from importing legacy web DB wrappers", () => {
    const offenders = findFilesMatching(
      findRuntimeSourceFiles(SRC_DIR).filter(
        (file) => !file.includes(join("src", "db"))
      ),
      LEGACY_DB_IMPORT_PATTERN
    );

    expect(offenders).toEqual([]);
  });
});
