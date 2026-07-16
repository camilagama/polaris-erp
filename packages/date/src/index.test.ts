import { describe, expect, it } from "vitest";
import {
  formatBusinessDate,
  formatBusinessDateLabel,
  getBusinessMonthBounds,
  shiftBusinessDate,
} from "./index";

describe("business date helpers", () => {
  it("formats an instant in the Sao Paulo business timezone", () => {
    expect(formatBusinessDate(new Date("2026-01-01T02:59:59.999Z"))).toBe(
      "2025-12-31"
    );
    expect(formatBusinessDate(new Date("2026-01-01T03:00:00.000Z"))).toBe(
      "2026-01-01"
    );
  });

  it("formats a civil date label without using the runtime timezone", () => {
    expect(
      formatBusinessDateLabel("2026-01-01", {
        day: "2-digit",
        month: "2-digit",
      })
    ).toBe("01/01");
  });

  it("shifts calendar dates across leap days and year boundaries", () => {
    expect(shiftBusinessDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftBusinessDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("returns the exact month bounds for a civil date", () => {
    expect(getBusinessMonthBounds("2024-02-29")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});
