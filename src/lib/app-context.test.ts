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

  it("keeps organization deletion restricted to the owner", () => {
    expect(canRolePerform("admin", "organization:delete")).toBe(false);
    expect(canRolePerform("owner", "organization:delete")).toBe(true);
  });

  it("normalizes organization slugs from names", () => {
    expect(resolveDefaultOrganizationSlug("  Polaris Brasil  ")).toBe(
      "dg-imports-brasil"
    );
  });
});
