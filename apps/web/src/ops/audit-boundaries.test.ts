import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CORE_AUDIT_BOUNDARIES,
  checkCoreAuditBoundaries,
  findBestEffortAuditCallsInCoreFunctions,
} from "../../../../scripts/check-core-audit-boundaries";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

describe("core audit boundary guard", () => {
  it("detects best-effort audit calls inside monitored core write actions", () => {
    const findings = findBestEffortAuditCallsInCoreFunctions({
      filePath: "apps/web/src/features/products/actions.ts",
      functionNames: ["updateProductAction"],
      sourceText: `
        export async function updateProductAction() {
          await recordAuditEvent({ type: "product.updated" });
        }
      `,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        filePath: "apps/web/src/features/products/actions.ts",
        functionName: "updateProductAction",
      }),
    ]);
  });

  it("monitors product image metadata actions after audit moved into the image transaction", () => {
    const productBoundary = CORE_AUDIT_BOUNDARIES.find((boundary) =>
      boundary.filePath.replaceAll("\\", "/").endsWith("products/actions.ts")
    );

    expect(productBoundary?.functionNames).toEqual(
      expect.arrayContaining([
        "replaceProductImageAction",
        "removeProductImageAction",
      ])
    );
  });

  it("monitors goal write actions after audit moved into goal transactions", () => {
    const goalsBoundary = CORE_AUDIT_BOUNDARIES.find((boundary) =>
      boundary.filePath.replaceAll("\\", "/").endsWith("goals/actions.ts")
    );

    expect(goalsBoundary?.functionNames).toEqual(
      expect.arrayContaining([
        "archiveGoalAction",
        "createGoalAction",
        "unarchiveGoalAction",
        "updateGoalAction",
      ])
    );
  });

  it("monitors catalog write actions after audit moved into catalog transactions", () => {
    const catalogBoundary = CORE_AUDIT_BOUNDARIES.find((boundary) =>
      boundary.filePath.replaceAll("\\", "/").endsWith("catalog/actions.ts")
    );

    expect(catalogBoundary?.functionNames).toEqual(
      expect.arrayContaining([
        "createCategoryAction",
        "deleteCategoryAction",
        "saveCatalogSettingsAction",
        "updateCategoryAction",
      ])
    );
  });

  it("detects best-effort audit calls inside monitored product image metadata actions", () => {
    const findings = findBestEffortAuditCallsInCoreFunctions({
      filePath: "apps/web/src/features/products/actions.ts",
      functionNames: ["replaceProductImageAction"],
      sourceText: `
        export async function replaceProductImageAction() {
          await recordAuditEvent({ type: "product_image.replaced" });
        }
      `,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        filePath: "apps/web/src/features/products/actions.ts",
        functionName: "replaceProductImageAction",
      }),
    ]);
  });

  it("passes for the current core ERP write actions", () => {
    expect(checkCoreAuditBoundaries(WORKSPACE_ROOT)).toEqual([]);
  });
});
