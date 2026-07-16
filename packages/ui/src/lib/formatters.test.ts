import { describe, expect, it } from "vitest";
import { formatDateTime } from "./formatters";

const SAO_PAULO_TIMESTAMP_PATTERN = /31\/12\/2025.*23:30/;

describe("formatDateTime", () => {
  it("presents timestamps in Sao Paulo time", () => {
    expect(formatDateTime("2026-01-01T02:30:00.000Z")).toMatch(
      SAO_PAULO_TIMESTAMP_PATTERN
    );
  });
});
