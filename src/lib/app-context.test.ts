import { describe, expect, it } from "vitest";
import {
  canRolePerform,
  getRoleRank,
  type OrganizationRole,
  resolveDefaultOrganizationSlug,
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

  it("allows admins to manage members but not owner-only organization deletion", () => {
    expect(canRolePerform("admin", "members:write")).toBe(true);
    expect(canRolePerform("admin", "organization:delete")).toBe(false);
  });

  it("normalizes organization slugs from names", () => {
    expect(resolveDefaultOrganizationSlug("  DG Imports Brasil  ")).toBe(
      "dg-imports-brasil"
    );
  });
});
