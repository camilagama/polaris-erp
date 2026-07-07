import { describe, expect, it } from "vitest";
import { validateE2eDatabaseEnv } from "@/lib/playwright-env";

describe("validateE2eDatabaseEnv", () => {
  it("rejects CI runs without an isolated E2E database", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        CI: "true",
        E2E_DATABASE_URL: undefined,
      })
    ).toThrow("CI exige E2E_DATABASE_URL");
  });

  it("accepts CI runs with an isolated E2E database", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        CI: "true",
        E2E_DATABASE_URL: "postgres://e2e:e2e@example.com/e2e",
      })
    ).not.toThrow();
  });

  it("allows explicit local shared database opt-in outside CI", () => {
    expect(() =>
      validateE2eDatabaseEnv({
        ALLOW_E2E_SHARED_DATABASE: "true",
        CI: undefined,
        E2E_DATABASE_URL: undefined,
      })
    ).not.toThrow();
  });
});
