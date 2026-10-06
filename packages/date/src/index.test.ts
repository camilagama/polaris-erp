import { describe, expect, it } from "vitest";
import {
  formatBusinessDate,
  formatBusinessDateLabel,
  getBusinessMonthBounds,
  isValidCivilDate,
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

  it("formats a civil date label without shifting across runtime timezones", () => {
    const originalTimeZone = process.env.TZ;

    try {
      process.env.TZ = "UTC";
      const utcLabel = formatBusinessDateLabel("2026-01-01", {
        day: "2-digit",
        month: "2-digit",
      });

      process.env.TZ = "Pacific/Honolulu";
      const honoluluLabel = formatBusinessDateLabel("2026-01-01", {
        day: "2-digit",
        month: "2-digit",
      });

      expect(utcLabel).toBe("01/01");
      expect(honoluluLabel).toBe(utcLabel);
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
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

  it("validates civil dates and the supported year range", () => {
    expect(isValidCivilDate("2024-02-29")).toBe(true);
    expect(isValidCivilDate("2023-02-29")).toBe(false);
    expect(isValidCivilDate("2024-2-09")).toBe(false);
    expect(isValidCivilDate("0099-12-31")).toBe(false);
    expect(isValidCivilDate("0100-01-01")).toBe(true);
  });
});
