import { describe, expect, it } from "vitest";
import {
  formatDateInputValue,
  getBusinessMonthBounds,
  shiftBusinessDate,
} from "@/lib/domain/date";

describe("formatDateInputValue", () => {
  it("uses the Sao Paulo calendar date instead of the runtime timezone", () => {
    expect(formatDateInputValue(new Date("2026-01-01T02:30:00.000Z"))).toBe(
      "2025-12-31"
    );
    expect(formatDateInputValue(new Date("2026-01-01T03:30:00.000Z"))).toBe(
      "2026-01-01"
    );
  });
});

describe("business calendar arithmetic", () => {
  it("shifts a civil date without reinterpreting it in the runtime timezone", () => {
    expect(shiftBusinessDate("2026-01-01", -29)).toBe("2025-12-03");
    expect(shiftBusinessDate("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("returns the bounds of the calendar month containing a business date", () => {
    expect(getBusinessMonthBounds("2026-02-15")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("rejects an invalid civil date instead of normalizing it", () => {
    expect(() => shiftBusinessDate("2026-02-30", 1)).toThrow(RangeError);
  });
});
