import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type AppPermission,
  canRolePerform,
  getRoleRank,
  type OrganizationRole,
} from "@/lib/app-context";

describe("organization roles", () => {
  it("models a tenant as its single owner", () => {
    expect(["owner"] as OrganizationRole[]).toEqual(["owner"]);
    expect(getRoleRank("owner")).toBe(1);
  });

  it("permits every current operational action to the individual owner", () => {
    const permissions: AppPermission[] = [
      "analytics:read",
      "catalog:read",
      "organization:delete",
      "products:write",
      "sales:write",
      "settings:write",
    ];

    for (const permission of permissions) {
      expect(canRolePerform("owner", permission)).toBe(true);
    }
  });

  it("does not expose customer-name-based organization slug generation", () => {
    const source = readFileSync(new URL("./app-context.ts", import.meta.url), {
      encoding: "utf8",
    });

    expect(source).not.toContain("resolveDefaultOrganizationSlug");
  });
});
