import { readdirSync } from "node:fs";
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
const MOVED_FROM_LIB_FILENAMES = new Set([
  "asaas-billing-reconciliation.ts",
  "asaas-webhook.ts",
  "deployment-smoke.ts",
  "e2e-bootstrap-billing.ts",
  "e2e-database-schema.ts",
  "email-service.ts",
  "postgres-plan.ts",
  "production-preflight.ts",
  "resend-webhook.ts",
  "webhook-request-limits.ts",
  "woovi-billing-reconciliation.ts",
  "woovi-webhook.ts",
]);

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

  it("keeps provider, webhook and ops modules out of the shared lib root", () => {
    const offenders = readdirSync(LIB_DIR).filter((fileName) =>
      MOVED_FROM_LIB_FILENAMES.has(fileName)
    );

    expect(offenders).toEqual([]);
  });
});
