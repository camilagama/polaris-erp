import { describe, expect, it } from "vitest";
import { defaultMonthRange } from "./goal-period-defaults";

describe("defaultMonthRange", () => {
  it("uses the Sao Paulo month at the UTC day boundary", () => {
    expect(defaultMonthRange(new Date("2026-01-01T02:30:00Z"))).toEqual({
      periodEnd: "2025-12-31",
      periodStart: "2025-12-01",
      rangePreset: null,
    });
  });
});
