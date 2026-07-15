import { describe, expect, it } from "vitest";
import { resolveAdminAuthOptions } from "./admin-auth-options";

describe("resolveAdminAuthOptions", () => {
  it("uses the dedicated local admin origin", () => {
    expect(
      resolveAdminAuthOptions({
        ADMIN_BETTER_AUTH_SECRET: "a".repeat(32),
        ADMIN_GOOGLE_CLIENT_ID: "admin-client",
        ADMIN_GOOGLE_CLIENT_SECRET: "admin-secret",
        ADMIN_APP_URL: "http://localhost:3001",
        NODE_ENV: "development",
      })
    ).toMatchObject({
      baseUrl: "http://localhost:3001",
      hasGoogleAuth: true,
    });
  });

  it("requires a dedicated OAuth client in production", () => {
    expect(() =>
      resolveAdminAuthOptions({
        ADMIN_APP_URL: "https://admin.example.com",
        ADMIN_BETTER_AUTH_SECRET: "a".repeat(32),
        NODE_ENV: "production",
      })
    ).toThrow("ADMIN_GOOGLE_CLIENT_ID and ADMIN_GOOGLE_CLIENT_SECRET");
  });
});
