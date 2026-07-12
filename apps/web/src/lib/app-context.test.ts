import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type AppPermission,
  canRolePerform,
  getRoleRank,
  type OrganizationRole,
} from "@/lib/app-context";

describe("organization roles", () => {
  it("orders roles by operational authority", () => {
    expect(
      (["owner", "admin", "operator"] as OrganizationRole[]).map(getRoleRank)
    ).toEqual([4, 3, 2]);
  });

  it("allows operators to manage sales but not catalog settings", () => {
    expect(canRolePerform("operator", "sales:write")).toBe(true);
    expect(canRolePerform("operator", "settings:write")).toBe(false);
  });

  it("keeps organization deletion restricted to the owner", () => {
    expect(canRolePerform("admin", "organization:delete")).toBe(false);
    expect(canRolePerform("owner", "organization:delete")).toBe(true);
  });

  it("keeps the full role/action matrix explicit", () => {
    const matrix: Record<OrganizationRole, Record<AppPermission, boolean>> = {
      admin: {
        "analytics:read": true,
        "catalog:read": true,
        "organization:delete": false,
        "products:write": true,
        "sales:write": true,
        "settings:write": true,
      },
      operator: {
        "analytics:read": true,
        "catalog:read": true,
        "organization:delete": false,
        "products:write": true,
        "sales:write": true,
        "settings:write": false,
      },
      owner: {
        "analytics:read": true,
        "catalog:read": true,
        "organization:delete": true,
        "products:write": true,
        "sales:write": true,
        "settings:write": true,
      },
    };

    for (const [role, permissions] of Object.entries(matrix)) {
      for (const [permission, expected] of Object.entries(permissions)) {
        expect(
          canRolePerform(role as OrganizationRole, permission as AppPermission)
        ).toBe(expected);
      }
    }
  });

  it("does not expose customer-name-based organization slug generation", () => {
    const source = readFileSync(new URL("./app-context.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).not.toContain("resolveDefaultOrganizationSlug");
  });
});
