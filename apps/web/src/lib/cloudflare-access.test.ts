import { describe, expect, it, vi } from "vitest";
import {
  type VerifyCloudflareAccessJwt,
  verifyCloudflareAccessHeaders,
} from "@/lib/cloudflare-access";

vi.mock("server-only", () => ({}));

describe("verifyCloudflareAccessHeaders", () => {
  it("skips validation when Access is not configured outside an enforced environment", async () => {
    await expect(
      verifyCloudflareAccessHeaders(new Headers(), {
        audience: undefined,
        enforce: false,
        teamDomain: undefined,
      })
    ).resolves.toBeNull();
  });

  it("fails closed when Access is enforced but not configured", async () => {
    await expect(
      verifyCloudflareAccessHeaders(new Headers(), {
        audience: undefined,
        enforce: true,
        teamDomain: undefined,
      })
    ).rejects.toThrow("Cloudflare Access is not configured.");
  });

  it("requires the Access assertion header when configured", async () => {
    await expect(
      verifyCloudflareAccessHeaders(new Headers(), {
        audience: "aud-1",
        enforce: true,
        teamDomain: "https://team.cloudflareaccess.com",
      })
    ).rejects.toThrow("Cloudflare Access assertion is missing.");
  });

  it("verifies the JWT with normalized issuer and audience", async () => {
    const verifyJwt = vi.fn<VerifyCloudflareAccessJwt>().mockResolvedValue({
      email: "founder@example.com",
      subject: "access-user-1",
    });
    const headers = new Headers({
      "Cf-Access-Jwt-Assertion": "jwt-token",
    });

    const identity = await verifyCloudflareAccessHeaders(
      headers,
      {
        audience: "aud-1",
        enforce: true,
        teamDomain: "team.cloudflareaccess.com/",
      },
      verifyJwt
    );

    expect(identity).toEqual({
      email: "founder@example.com",
      subject: "access-user-1",
    });
    expect(verifyJwt).toHaveBeenCalledWith("jwt-token", {
      audience: "aud-1",
      teamDomain: "https://team.cloudflareaccess.com",
    });
  });
});
