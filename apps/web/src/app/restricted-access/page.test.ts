import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = join(import.meta.dirname, "page.tsx");

describe("RestrictedAccessPage", () => {
  it("provides a dedicated suspension route instead of onboarding", () => {
    expect(existsSync(pagePath)).toBe(true);

    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("Acesso restrito");
    expect(source).toContain('redirect("/sign-in")');
    expect(source).toContain("getAppAccess");
    expect(source).toContain('access.kind !== "suspended"');
  });
});
