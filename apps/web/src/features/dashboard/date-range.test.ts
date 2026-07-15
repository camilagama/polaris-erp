import { describe, expect, it } from "vitest";
import { resolveDashboardDateRange } from "@/features/dashboard/date-range";

describe("resolveDashboardDateRange", () => {
  it("uses all-time bounds through today when preset is all-time", () => {
    const range = resolveDashboardDateRange({
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

  it("uses Sao Paulo when resolving a preset across the UTC year boundary", () => {
    const range = resolveDashboardDateRange({
      referenceDate: new Date("2026-01-01T02:30:00.000Z"),
      searchParams: {
        preset: "current-month",
      },
    });

    expect(range).toMatchObject({
      from: "2025-12-01",
      preset: "current-month",
      to: "2025-12-31",
    });
  });
});
