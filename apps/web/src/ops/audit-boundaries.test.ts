import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
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

  it("ignores best-effort audit calls in external-side-effect actions outside the monitored core set", () => {
    const findings = findBestEffortAuditCallsInCoreFunctions({
      filePath: "apps/web/src/features/products/actions.ts",
      functionNames: ["updateProductAction"],
      sourceText: `
        export async function replaceProductImageAction() {
          await recordAuditEvent({ type: "product_image.replaced" });
        }
      `,
    });

    expect(findings).toEqual([]);
  });

  it("passes for the current core ERP write actions", () => {
    expect(checkCoreAuditBoundaries(WORKSPACE_ROOT)).toEqual([]);
  });
});
