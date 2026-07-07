import { describe, expect, it } from "vitest";
import { createInternalImportPattern } from "./boundary-test-helpers";

describe("boundary test helpers", () => {
  it("matches static, dynamic, and side-effect internal imports", () => {
    const pattern = createInternalImportPattern(["db"]);

    expect('import { db } from "@/db";').toMatch(pattern);
    expect('const dbModule = await import("@/db");').toMatch(pattern);
    expect('import "@/db/schema";').toMatch(pattern);
  });

  it("does not match adjacent internal module names", () => {
    const pattern = createInternalImportPattern(["app", "features"]);

    expect('import { Button } from "@/application/ui";').not.toMatch(pattern);
    expect('const module = await import("@/feature-flags");').not.toMatch(
      pattern
    );
  });
});
