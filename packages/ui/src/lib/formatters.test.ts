import { describe, expect, it } from "vitest";
import { formatCivilDate, formatInstantDateTime } from "./formatters";

const SAO_PAULO_TIMESTAMP_PATTERN = /31\/12\/2025.*23:30/;

describe("formatCivilDate", () => {
  it("formats valid civil dates without a timezone conversion", () => {
    expect(formatCivilDate("2026-01-01")).toBe("01/01/2026");
    expect(formatCivilDate("2024-02-29")).toBe("29/02/2024");
  });

  it("rejects timestamps and invalid calendar dates", () => {
    expect(() => formatCivilDate("2026-01-01T00:00:00Z")).toThrow(RangeError);
    expect(() => formatCivilDate("2026-02-30")).toThrow(RangeError);
  });

  it("keeps the existing empty-value placeholder", () => {
    expect(formatCivilDate(null)).toBe("-");
  });
});

describe("formatInstantDateTime", () => {
  it("presents ISO instants in Sao Paulo time", () => {
    expect(formatInstantDateTime("2026-01-01T02:30:00.000Z")).toMatch(
      SAO_PAULO_TIMESTAMP_PATTERN
    );
  });

  it("accepts explicit ISO offsets", () => {
    expect(formatInstantDateTime("2026-01-01T05:30:00+03:00")).toMatch(
      SAO_PAULO_TIMESTAMP_PATTERN
    );
  });

  it("rejects dates and date-times without an offset", () => {
    expect(() => formatInstantDateTime("2026-01-01")).toThrow(RangeError);
    expect(() => formatInstantDateTime("2026-01-01T02:30:00")).toThrow(
      RangeError
    );
  });

  it("rejects noncanonical times and sub-millisecond precision", () => {
    for (const value of [
      "2026-01-01T24:00:00Z",
      "2026-01-01T02:30:00.1234Z",
      "2026-01-01T02:30:00+03:60",
      "2026-01-01T02:30:00-00:00",
    ]) {
      expect(() => formatInstantDateTime(value)).toThrow(RangeError);
    }
  });

  it("is invariant when the runtime timezone changes", () => {
    const originalTimeZone = process.env.TZ;

    try {
      process.env.TZ = "UTC";
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");
      const utcResults = [
        formatCivilDate("2026-01-01"),
        formatInstantDateTime("2026-01-01T02:30:00.000Z"),
      ];

      process.env.TZ = "Pacific/Honolulu";
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
        "Pacific/Honolulu"
      );
      expect([
        formatCivilDate("2026-01-01"),
        formatInstantDateTime("2026-01-01T02:30:00.000Z"),
      ]).toEqual(utcResults);
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
  });
});
