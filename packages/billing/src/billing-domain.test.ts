import {
  getEntitlementValue,
  hasBillableAccess,
  normalizeBillingStatus,
} from "@polaris/billing";
import { describe, expect, it } from "vitest";

describe("@polaris/billing", () => {
  it("evaluates canonical subscription access without provider fields", () => {
    expect(hasBillableAccess("trialing")).toBe(false);
    expect(hasBillableAccess("active")).toBe(true);
    expect(hasBillableAccess("past_due")).toBe(false);
    expect(hasBillableAccess("paused")).toBe(false);
    expect(hasBillableAccess("canceled")).toBe(false);
    expect(hasBillableAccess("incomplete")).toBe(false);
  });

  it("normalizes unknown statuses to an explicit incomplete state", () => {
    expect(normalizeBillingStatus("ACTIVE")).toBe("active");
    expect(normalizeBillingStatus("provider_weird")).toBe("incomplete");
  });

  it("reads entitlement values by canonical key", () => {
    expect(
      getEntitlementValue(
        [
          { key: "catalog.products.limit", value: 500 },
          { key: "support.priority", value: true },
        ],
        "catalog.products.limit"
      )
    ).toBe(500);
  });
});
