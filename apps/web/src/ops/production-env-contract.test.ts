import { describe, expect, it } from "vitest";
import { getProductionPreflightWorkflowSection } from "../../../../scripts/check-production-env-contract";

describe("production environment workflow contract parser", () => {
  it("finds the production preflight job with LF and CRLF line endings", () => {
    const workflow = [
      "jobs:",
      "  verify:",
      "    runs-on: ubuntu-latest",
      "  production-preflight:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "  deployment-smoke:",
      "    runs-on: ubuntu-latest",
      "",
    ].join("\n");

    const lfSection = getProductionPreflightWorkflowSection(workflow);
    const crlfSection = getProductionPreflightWorkflowSection(
      workflow.replaceAll("\n", "\r\n")
    );

    expect(lfSection).toContain("production-preflight:");
    expect(crlfSection).toBe(lfSection);
    expect(lfSection).not.toContain("deployment-smoke:");
  });
});
