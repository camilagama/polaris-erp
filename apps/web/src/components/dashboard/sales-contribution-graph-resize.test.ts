import { getNextRoundedContainerWidth } from "@polaris/ui/hooks/use-container-width";
import { describe, expect, it } from "vitest";

describe("getNextRoundedContainerWidth", () => {
  it("rounds measured widths before updating state", () => {
    expect(getNextRoundedContainerWidth(null, 417.6)).toBe(418);
    expect(getNextRoundedContainerWidth(418, 417.6)).toBeNull();
  });

  it("ignores repeated widths after rounding", () => {
    expect(getNextRoundedContainerWidth(552, 552.2)).toBeNull();
    expect(getNextRoundedContainerWidth(552, 552.49)).toBeNull();
    expect(getNextRoundedContainerWidth(552, 552.6)).toBe(553);
  });
});
