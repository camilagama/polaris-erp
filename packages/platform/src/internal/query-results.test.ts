import { describe, expect, it } from "vitest";
import {
  toIsoString,
  toNullableString,
  toNumber,
  toRows,
  toStringValue,
} from "./query-results";

describe("query result parsing", () => {
  it("extracts record rows from array and driver rows results", () => {
    expect(toRows([{ id: "row-1" }, null, "ignored"])).toEqual([
      { id: "row-1" },
    ]);
    expect(toRows({ rows: [{ id: "row-2" }, undefined, 1] })).toEqual([
      { id: "row-2" },
    ]);
    expect(toRows({ rows: "invalid" })).toEqual([]);
  });

  it("normalizes numbers from driver values", () => {
    expect(toNumber(12)).toBe(12);
    expect(toNumber(12n)).toBe(12);
    expect(toNumber("12")).toBe(12);
    expect(toNumber("invalid")).toBe(0);
    expect(toNumber(null)).toBe(0);
  });

  it("normalizes dates and string values", () => {
    expect(toIsoString(new Date("2026-07-13T12:00:00.000Z"))).toBe(
      "2026-07-13T12:00:00.000Z"
    );
    expect(toIsoString("2026-07-13T12:00:00.000Z")).toBe(
      "2026-07-13T12:00:00.000Z"
    );
    expect(toIsoString("")).toBeNull();
    expect(toStringValue("value")).toBe("value");
    expect(toStringValue(null, "fallback")).toBe("fallback");
    expect(toNullableString("")).toBeNull();
    expect(toNullableString("value")).toBe("value");
  });

  it("normalizes PostgreSQL timestamp text to canonical ISO instants", () => {
    expect(toIsoString("2026-10-03 12:07:53.236765+00")).toBe(
      "2026-10-03T12:07:53.236Z"
    );
    expect(toIsoString("2026-10-03 07:07:53.236765-05")).toBe(
      "2026-10-03T12:07:53.236Z"
    );
    expect(toIsoString("2026-10-03 17:37:53.236765+05:30")).toBe(
      "2026-10-03T12:07:53.236Z"
    );
  });

  it("preserves invalid PostgreSQL timestamp text for downstream validation", () => {
    expect(toIsoString("2026-02-30 12:07:53.236765+00")).toBe(
      "2026-02-30 12:07:53.236765+00"
    );
  });
});
