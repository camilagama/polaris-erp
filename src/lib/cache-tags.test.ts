import { describe, expect, it } from "vitest";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

describe("buildOrganizationCacheTags", () => {
  it("scopes catalog and analytics tags by organization", () => {
    expect(buildOrganizationCacheTags("org_123")).toEqual({
      analytics: "analytics:org_123",
      catalog: "catalog:org_123",
    });
  });
});
