import { describe, expect, it } from "vitest";
import { formatDateInputValue } from "@/lib/domain/date";

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
