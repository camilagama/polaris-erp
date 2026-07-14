import { describe, expect, it } from "vitest";
import {
  createE2eServerEnv,
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  parseE2eSetCookie,
  requireE2eDatabaseUrl,
} from "./index";

describe("E2E support", () => {
  it("requires an isolated database URL instead of falling back to DATABASE_URL", () => {
    expect(() =>
      requireE2eDatabaseUrl({ DATABASE_URL: "postgres://shared" })
    ).toThrow("E2E_DATABASE_URL");
  });

  it("overrides runtime database configuration with the explicit E2E URL", () => {
    expect(
      createE2eServerEnv({
        DATABASE_URL: "postgres://shared",
        E2E_DATABASE_URL: "postgres://isolated",
      })
    ).toMatchObject({
      ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
      DATABASE_URL: "postgres://isolated",
      INTERNAL_BOOTSTRAP_SECRET: E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
      NODE_ENV: "production",
    });
  });

  it("parses bootstrap cookies without importing either application", () => {
    expect(
      parseE2eSetCookie(
        "session=value; HttpOnly; Path=/; SameSite=Strict",
        "http://127.0.0.1:3001"
      )
    ).toMatchObject({
      domain: "127.0.0.1",
      httpOnly: true,
      name: "session",
      path: "/",
      sameSite: "Strict",
      value: "value",
    });
  });
});
