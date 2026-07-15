import {
  FREE_PLAN_ENTITLEMENTS,
  getEntitlementValue,
  getGracePeriodEnd,
  hasBillableAccess,
  normalizeBillingStatus,
  PAID_MONTHLY_PLAN_ENTITLEMENTS,
  resolveBillingLifecycleTransition,
  resolvePlanEntitlements,
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

  it("exposes the approved Free and monthly paid quotas", () => {
    expect(FREE_PLAN_ENTITLEMENTS).toEqual({
      maxActiveGoals: 1,
      maxImagesPerProduct: 1,
      maxRegisteredProducts: 50,
    });
    expect(PAID_MONTHLY_PLAN_ENTITLEMENTS).toEqual({
      maxActiveGoals: 3,
      maxImagesPerProduct: 5,
      maxRegisteredProducts: 250,
    });
  });

  it("falls back to Free quotas when persisted entitlements are incomplete", () => {
    expect(
      resolvePlanEntitlements([
        { key: "catalog.products.limit", value: 250 },
        { key: "goals.active.limit", value: "invalid" },
      ])
    ).toEqual({
      maxActiveGoals: 1,
      maxImagesPerProduct: 1,
      maxRegisteredProducts: 250,
    });
  });

  it("keeps paid access during the seven-day grace period and downgrades afterwards", () => {
    const gracePeriodEndsAt = getGracePeriodEnd(
      new Date("2026-07-14T10:00:00.000Z")
    );

    expect(
      resolveBillingLifecycleTransition({
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-07-14T10:00:00.000Z"),
        gracePeriodEndsAt,
        now: new Date("2026-07-21T09:59:59.999Z"),
        status: "past_due",
      })
    ).toBe("none");
    expect(
      resolveBillingLifecycleTransition({
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-07-14T10:00:00.000Z"),
        gracePeriodEndsAt,
        now: new Date("2026-07-21T10:00:00.000Z"),
        status: "past_due",
      })
    ).toBe("downgrade_to_free");
  });

  it("downgrades a voluntary cancellation only after the paid period ends", () => {
    expect(
      resolveBillingLifecycleTransition({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date("2026-07-15T00:00:00.000Z"),
        gracePeriodEndsAt: null,
        now: new Date("2026-07-14T23:59:59.999Z"),
        status: "active",
      })
    ).toBe("none");
    expect(
      resolveBillingLifecycleTransition({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date("2026-07-15T00:00:00.000Z"),
        gracePeriodEndsAt: null,
        now: new Date("2026-07-15T00:00:00.000Z"),
        status: "active",
      })
    ).toBe("downgrade_to_free");
  });
});
