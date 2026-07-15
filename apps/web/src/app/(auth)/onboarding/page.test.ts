import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("OnboardingPage", () => {
  it("redirects suspended accounts to the dedicated restricted access route", () => {
    const source = readFileSync(join(import.meta.dirname, "page.tsx"), "utf8");

    expect(source).toContain("getAppAccess");
    expect(source).toContain('access.kind === "suspended"');
    expect(source).toContain('redirect("/restricted-access")');
  });
});
