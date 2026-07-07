import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(process.cwd(), "src", "components");
const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const APP_PAGINATION_IMPORT_PATTERN =
  /from\s+["']@\/app\/\(app\)\/(?:produtos|vendas)\/pagination["']/;
const APP_GOAL_ACTIONS_IMPORT_PATTERN =
  /from\s+["']@\/app\/\(app\)\/metas\/actions["']/;
const APP_CATALOG_ACTIONS_IMPORT_PATTERN =
  /from\s+["']@\/app\/\(app\)\/configuracoes\/actions["']/;
const APP_SALES_ACTIONS_IMPORT_PATTERN =
  /from\s+["']@\/app\/\(app\)\/vendas\/actions["']/;
const APP_PRODUCT_ACTIONS_IMPORT_PATTERN =
  /from\s+["']@\/app\/\(app\)\/produtos\/actions["']/;

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

describe("component boundaries", () => {
  it("keeps pagination server actions outside the app route tree", () => {
    const offenders = listSourceFiles(COMPONENTS_DIR)
      .filter((file) =>
        APP_PAGINATION_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps goal server actions outside the app route tree", () => {
    const offenders = listSourceFiles(COMPONENTS_DIR)
      .filter((file) =>
        APP_GOAL_ACTIONS_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps catalog settings server actions outside the app route tree", () => {
    const offenders = listSourceFiles(COMPONENTS_DIR)
      .filter((file) =>
        APP_CATALOG_ACTIONS_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps sales server actions outside the app route tree", () => {
    const offenders = listSourceFiles(COMPONENTS_DIR)
      .filter((file) =>
        APP_SALES_ACTIONS_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps product server actions outside the app route tree", () => {
    const offenders = listSourceFiles(COMPONENTS_DIR)
      .filter((file) =>
        APP_PRODUCT_ACTIONS_IMPORT_PATTERN.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
