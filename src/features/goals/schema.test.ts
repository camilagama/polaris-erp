import { describe, expect, it } from "vitest";
import {
  createGoalSchema,
  goalPeriodIsCreatable,
  periodIncludesToday,
  validateGoalTargetValue,
} from "@/features/goals/schema";

describe("periodIncludesToday", () => {
  it("returns true when today lies inside the range", () => {
    expect(
      periodIncludesToday({
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        today: "2025-06-15",
      })
    ).toBe(true);
  });

  it("returns false when today is outside the range", () => {
    expect(
      periodIncludesToday({
        periodEnd: "2025-05-31",
        periodStart: "2025-05-01",
        today: "2025-06-01",
      })
    ).toBe(false);
  });
});

describe("goalPeriodIsCreatable", () => {
  it("allows future goals", () => {
    expect(
      goalPeriodIsCreatable({
        periodEnd: "2025-07-31",
        periodStart: "2025-07-01",
        today: "2025-06-15",
      })
    ).toBe(true);
  });

  it("allows ranges that started in the past and still include today", () => {
    expect(
      goalPeriodIsCreatable({
        periodEnd: "2025-06-30",
        periodStart: "2025-06-01",
        today: "2025-06-15",
      })
    ).toBe(true);
  });

  it("rejects fully past ranges", () => {
    expect(
      goalPeriodIsCreatable({
        periodEnd: "2025-05-31",
        periodStart: "2025-05-01",
        today: "2025-06-01",
      })
    ).toBe(false);
  });
});

describe("validateGoalTargetValue", () => {
  it("requires integer targets for sales_count", () => {
    expect(validateGoalTargetValue("sales_count", 3.5)).toBeTruthy();
    expect(validateGoalTargetValue("sales_count", 3)).toBeUndefined();
  });

  it("requires positive money targets", () => {
    expect(validateGoalTargetValue("revenue", 0)).toBeTruthy();
    expect(validateGoalTargetValue("profit", 1)).toBeUndefined();
  });
});

describe("createGoalSchema", () => {
  const validBase = {
    displayMode: "percentage" as const,
    metric: "revenue" as const,
    name: "Meta teste",
    periodEnd: "2025-06-30",
    periodStart: "2025-06-01",
    targetValue: 100,
  };

  it("accepts a valid payload", () => {
    expect(() => createGoalSchema.parse(validBase)).not.toThrow();
  });

  it("rejects end before start", () => {
    const result = createGoalSchema.safeParse({
      ...validBase,
      periodEnd: "2025-05-01",
      periodStart: "2025-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sales_count target", () => {
    const result = createGoalSchema.safeParse({
      ...validBase,
      metric: "sales_count" as const,
      targetValue: 2.5,
    });
    expect(result.success).toBe(false);
  });
});
