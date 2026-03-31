import { describe, expect, it } from "vitest";
import {
  canDeleteCategory,
  canRenameCategory,
  isProtectedCategory,
} from "@/features/catalog/guards";

describe("category guards", () => {
  it("marks the system category as protected", () => {
    const category = {
      isSystem: true,
      key: "others",
    };

    expect(isProtectedCategory(category)).toBe(true);
    expect(canRenameCategory(category)).toBe(false);
    expect(canDeleteCategory(category, 0)).toBe(false);
  });

  it("blocks deletion when a regular category still has linked products", () => {
    const category = {
      isSystem: false,
      key: "phones",
    };

    expect(canRenameCategory(category)).toBe(true);
    expect(canDeleteCategory(category, 2)).toBe(false);
    expect(canDeleteCategory(category, 0)).toBe(true);
  });
});
