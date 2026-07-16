import { describe, expect, it } from "vitest";
import { resolveEventsPresetRange } from "./events-date-filter";

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
