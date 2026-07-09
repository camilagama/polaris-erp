import { describe, expect, it } from "vitest";
import {
  getSalesPresetDateRange,
  resolveSalesDateRange,
} from "@/features/sales/date-range";

describe("resolveSalesDateRange", () => {
  it("returns all-time bounds when preset is all-time", () => {
    const range = resolveSalesDateRange({
      bounds: {
        from: "2025-01-10",
        to: "2026-04-02",
      },
      referenceDate: new Date("2026-04-15T12:00:00.000Z"),
      searchParams: {
        preset: "all-time",
      },
    });

    expect(range).toMatchObject({
      from: "2025-01-10",
      preset: "all-time",
      to: "2026-04-15",
    });
  });

  it("keeps manual ranges even when a preset is invalid", () => {
    const range = resolveSalesDateRange({
      bounds: {
        from: "2026-04-02",
        to: "2026-04-02",
      },
      searchParams: {
        from: "2026-03-01",
        preset: "unknown",
        to: "2026-03-31",
      },
    });

    expect(range).toMatchObject({
      from: "2026-03-01",
      preset: null,
      to: "2026-03-31",
    });
  });

  it("falls back to today when there are no sales bounds", () => {
    const range = getSalesPresetDateRange({
      bounds: {
        from: "2026-04-02",
        to: "2026-04-02",
      },
      preset: "all-time",
      referenceDate: new Date("2026-04-15T12:00:00.000Z"),
    });

    expect(range).toMatchObject({
      from: "2026-04-02",
      preset: "all-time",
      to: "2026-04-15",
    });
  });
});
