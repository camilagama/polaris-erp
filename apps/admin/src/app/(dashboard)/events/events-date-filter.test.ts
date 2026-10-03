import { describe, expect, it } from "vitest";
import {
  resolveEventsDateRange,
  resolveEventsPresetRange,
} from "./events-date-range";

describe("resolveEventsPresetRange", () => {
  it("uses the Sao Paulo civil date at the UTC day boundary", () => {
    expect(
      resolveEventsPresetRange("last-7-days", new Date("2026-01-01T02:30:00Z"))
    ).toEqual({
      from: "2025-12-25",
      to: "2025-12-31",
    });
  });
});

describe("resolveEventsDateRange", () => {
  const now = new Date("2026-01-01T02:30:00Z");

  it("uses the full default seven-day business range", () => {
    expect(resolveEventsDateRange({}, now)).toEqual({
      from: "2025-12-25",
      invalidInput: false,
      preset: "last-7-days",
      to: "2025-12-31",
    });
  });

  it("resolves an explicit thirty-day preset without date parameters", () => {
    expect(resolveEventsDateRange({ preset: "last-30-days" }, now)).toEqual({
      from: "2025-12-02",
      invalidInput: false,
      preset: "last-30-days",
      to: "2025-12-31",
    });
  });

  it("preserves a valid custom civil date range", () => {
    expect(
      resolveEventsDateRange({ from: "2025-12-29", to: "2025-12-31" }, now)
    ).toEqual({
      from: "2025-12-29",
      invalidInput: false,
      preset: null,
      to: "2025-12-31",
    });
  });

  it("falls back to a bounded default for malformed, duplicate, or reversed ranges", () => {
    expect(
      resolveEventsDateRange({ from: "2025-02-30", to: "2025-12-31" }, now)
    ).toEqual({
      from: "2025-12-25",
      invalidInput: true,
      preset: "last-7-days",
      to: "2025-12-31",
    });
    expect(
      resolveEventsDateRange(
        { from: ["2025-12-25", "2025-12-26"], to: "2025-12-31" },
        now
      ).invalidInput
    ).toBe(true);
    expect(
      resolveEventsDateRange({ from: "2025-12-31", to: "2025-12-25" }, now)
        .invalidInput
    ).toBe(true);
  });
});
