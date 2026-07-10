import { describe, expect, it } from "vitest";
import { isTruthySmokeEnv, runAdminDeploymentSmoke } from "./deployment-smoke";

describe("runAdminDeploymentSmoke", () => {
  it("validates the admin health route payload", async () => {
    const result = await runAdminDeploymentSmoke({
      baseUrl: "https://admin.example.com",
      fetcher: async (_input) =>
        Response.json({ ok: true, service: "polaris-admin" }),
    });

    expect(result).toEqual({
      healthUrl: "https://admin.example.com/api/health",
      protectedByVercelAuthentication: false,
      status: "ok",
    });
  });

  it("accepts a protected deployment response when requested", async () => {
    const result = await runAdminDeploymentSmoke({
      baseUrl: "https://admin.example.com",
      expectProtected: true,
      fetcher: async () => new Response(null, { status: 403 }),
    });

    expect(result.status).toBe("protected");
    expect(result.protectedByVercelAuthentication).toBe(true);
  });

  it("fails protected responses when route reachability is expected", async () => {
    await expect(
      runAdminDeploymentSmoke({
        baseUrl: "https://admin.example.com",
        fetcher: async () => new Response(null, { status: 403 }),
      })
    ).rejects.toThrow("HTTP 403");
  });

  it("normalizes smoke boolean env values", () => {
    expect(isTruthySmokeEnv("true")).toBe(true);
    expect(isTruthySmokeEnv("1")).toBe(true);
    expect(isTruthySmokeEnv("false")).toBe(false);
    expect(isTruthySmokeEnv(undefined)).toBe(false);
  });
});
