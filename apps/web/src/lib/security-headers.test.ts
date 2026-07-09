import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "@/lib/security-headers";

describe("getSecurityHeaders", () => {
  it("returns the baseline production security headers", () => {
    expect(getSecurityHeaders()).toEqual([
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "Referrer-Policy",
        value: "origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
      },
    ]);
  });
});
