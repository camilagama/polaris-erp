import { describe, expect, it } from "vitest";
import { shouldLoadLocalAdminAuthEnvironment } from "./admin-auth-environment";

describe("Admin auth environment", () => {
  it("skips local dotenv files for the isolated Playwright server", () => {
    expect(
      shouldLoadLocalAdminAuthEnvironment({
        ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("loads local dotenv values outside the isolated Playwright server", () => {
    expect(
      shouldLoadLocalAdminAuthEnvironment({ NODE_ENV: "production" })
    ).toBe(true);
  });
});
