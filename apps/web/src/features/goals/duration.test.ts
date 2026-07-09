import { describe, expect, it } from "vitest";
import {
  calendarDaysFromPeriodStartToResolution,
  formatCompletionElapsedLabel,
} from "@/features/goals/duration";

describe("calendarDaysFromPeriodStartToResolution", () => {
  it("returns 0 for the same calendar day", () => {
    expect(
      calendarDaysFromPeriodStartToResolution(
        "2025-06-10",
        "2025-06-10T18:00:00.000Z"
      )
    ).toBe(0);
  });

  it("counts whole calendar days between start and resolution", () => {
    expect(
      calendarDaysFromPeriodStartToResolution(
        "2025-06-10",
        "2025-06-12T12:00:00.000Z"
      )
    ).toBe(2);
  });
});

describe("formatCompletionElapsedLabel", () => {
  it("describes same-day completion", () => {
    expect(
      formatCompletionElapsedLabel("2025-06-10", "2025-06-10T10:00:00.000Z")
    ).toContain("mesmo dia");
  });

  it("describes multi-day elapsed time", () => {
    expect(
      formatCompletionElapsedLabel("2025-06-01", "2025-06-05T10:00:00.000Z")
    ).toContain("4 dia");
  });
});
