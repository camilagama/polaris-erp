import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  rejectWorkspaceOrganizationUpdate,
  rejectWorkspaceUserManagement,
} from "@polaris/auth/workspace-management-policy";
import { describe, expect, it } from "vitest";

describe("workspace management policy", () => {
  it("blocks organization updates until platform admin audit exists", () => {
    expect(() => rejectWorkspaceOrganizationUpdate()).toThrow(
      expect.objectContaining({
        body: expect.objectContaining({
          code: "WORKSPACE_ORGANIZATION_UPDATE_DISABLED",
        }),
        status: "FORBIDDEN",
      })
    );
  });

  it("blocks direct workspace user management through Better Auth organization endpoints", () => {
    expect(() => rejectWorkspaceUserManagement()).toThrow(
      expect.objectContaining({
        body: expect.objectContaining({
          code: "WORKSPACE_USER_MANAGEMENT_DISABLED",
        }),
        status: "FORBIDDEN",
      })
    );
  });

  it("wires the organization update blocker into Better Auth organization hooks", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../../../../packages/auth/src/auth.ts"),
      "utf8"
    );

    expect(source).toContain(
      "beforeUpdateOrganization: rejectWorkspaceOrganizationUpdate"
    );
  });
});
