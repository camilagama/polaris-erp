import { describe, expect, it } from "vitest";
import { resolveCanonicalAppUrl } from "./app-url";

describe("resolveCanonicalAppUrl", () => {
  it("defaults development to localhost even when the public URL points to a tunnel", () => {
    expect(
      resolveCanonicalAppUrl({
        BETTER_AUTH_URL: "https://dev-tunnel.example.com",
        NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
        NODE_ENV: "development",
      })
    ).toBe("http://localhost:3000");
  });

  it("keeps Vercel development on localhost when public URL points to a tunnel", () => {
    expect(
      resolveCanonicalAppUrl({
        APP_LOCAL_URL: "http://localhost:3000",
        BETTER_AUTH_URL: "https://dev-tunnel.example.com",
        NEXT_PUBLIC_APP_URL: "https://dev-tunnel.example.com",
        NODE_ENV: "development",
        VERCEL_ENV: "development",
      })
    ).toBe("http://localhost:3000");
  });

  it("uses the public URL when development explicitly opts into public mode", () => {
    expect(
      resolveCanonicalAppUrl({
        APP_PUBLIC_URL: "https://dev-tunnel.example.com/",
        APP_URL_MODE: "public",
        NODE_ENV: "development",
      })
    ).toBe("https://dev-tunnel.example.com");
  });

  it("treats tunnel mode as public mode", () => {
    expect(
      resolveCanonicalAppUrl({
        APP_PUBLIC_URL: "https://dev-tunnel.example.com",
        APP_URL_MODE: "tunnel",
        NODE_ENV: "development",
      })
    ).toBe("https://dev-tunnel.example.com");
  });

  it("normalizes configured URLs to their origin", () => {
    expect(
      resolveCanonicalAppUrl({
        APP_PUBLIC_URL: "https://dev-tunnel.example.com/app/",
        APP_URL_MODE: "tunnel",
        NODE_ENV: "development",
      })
    ).toBe("https://dev-tunnel.example.com");
  });

  it("defaults Vercel preview to the configured public app URL", () => {
    expect(
      resolveCanonicalAppUrl({
        APP_LOCAL_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "https://preview.example.com",
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      })
    ).toBe("https://preview.example.com");
  });

  it("rejects public mode without a public URL", () => {
    expect(() =>
      resolveCanonicalAppUrl({
        APP_URL_MODE: "public",
        NODE_ENV: "development",
      })
    ).toThrow("APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL is required");
  });
});
