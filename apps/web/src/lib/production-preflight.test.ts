import { describe, expect, it } from "vitest";
import { validateProductionPreflight } from "@/lib/production-preflight";

const strongSecret = "x".repeat(32);
const runtimeUrl =
  "postgres://polaris_app:pass@runtime.example.neon.tech/neondb?sslmode=verify-full";
const ownerUrl =
  "postgres://neondb_owner:pass@runtime.example.neon.tech/neondb?sslmode=verify-full";
const e2eUrl =
  "postgres://polaris_app:pass@e2e.example.neon.tech/neondb?sslmode=verify-full";
const productionIntegrationEnv = {
  ADMIN_APP_URL: "https://admin.example.com",
  BETTER_AUTH_URL: "https://app.example.com",
  CLOUDFLARE_ACCESS_AUD: "cloudflare-access-audience",
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: "polaris.cloudflareaccess.com",
  DEPLOYMENT_SMOKE_URL: "https://app.example.com",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
  R2_ACCESS_KEY_ID: "r2-access-key",
  R2_ACCOUNT_ID: "r2-account-id",
  R2_BUCKET_PUBLIC: "polaris-public",
  R2_BUCKET_STAGING: "polaris-staging",
  R2_SECRET_ACCESS_KEY: "r2-secret-key",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  UPSTASH_REDIS_REST_URL: "https://upstash.example.com",
} as const;

describe("validateProductionPreflight", () => {
  it("accepts isolated runtime, migration, RLS smoke and E2E URLs", () => {
    const result = validateProductionPreflight({
      BETTER_AUTH_SECRET: strongSecret,
      CRON_SECRET: strongSecret,
      DATABASE_URL: runtimeUrl,
      DATABASE_URL_DIRECT: ownerUrl,
      E2E_DATABASE_URL: e2eUrl,
      INTERNAL_R2_HEALTH_SECRET: strongSecret,
      PRODUCT_IMAGE_RECONCILE_SECRET: strongSecret,
      RLS_DATABASE_URL: runtimeUrl,
      VERCEL_ENV: "production",
      ...productionIntegrationEnv,
    });

    expect(result).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects unsafe production deploy wiring", () => {
    const result = validateProductionPreflight({
      ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
      BETTER_AUTH_SECRET: "short",
      CRON_SECRET: "short",
      DATABASE_URL: ownerUrl,
      DATABASE_URL_DIRECT: ownerUrl,
      E2E_DATABASE_URL: ownerUrl,
      INTERNAL_R2_HEALTH_SECRET: "short",
      PRODUCT_IMAGE_RECONCILE_SECRET: "short",
      RLS_DATABASE_URL: ownerUrl,
      VERCEL_ENV: "production",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "DATABASE_URL must not equal DATABASE_URL_DIRECT.",
        "DATABASE_URL must use a runtime role, not neondb_owner.",
        "E2E_DATABASE_URL must not equal DATABASE_URL.",
        "E2E_DATABASE_URL must not equal RLS_DATABASE_URL.",
        "E2E_DATABASE_URL must use a runtime role, not neondb_owner.",
        "RLS_DATABASE_URL must not use neondb_owner.",
        "ALLOW_PLAYWRIGHT_BOOTSTRAP must not be enabled in Vercel production.",
        "BETTER_AUTH_SECRET must be at least 32 characters in production preflight.",
        "CRON_SECRET must be at least 32 characters in production preflight.",
        "INTERNAL_R2_HEALTH_SECRET must be at least 32 characters in production preflight.",
        "PRODUCT_IMAGE_RECONCILE_SECRET must be at least 32 characters in production preflight.",
        "BETTER_AUTH_URL is required in production preflight.",
        "ADMIN_APP_URL is required in production preflight.",
        "CLOUDFLARE_ACCESS_AUD is required in production preflight.",
        "CLOUDFLARE_ACCESS_TEAM_DOMAIN is required in production preflight.",
        "DEPLOYMENT_SMOKE_URL is required in production preflight.",
        "NEXT_PUBLIC_APP_URL is required in production preflight.",
        "GOOGLE_CLIENT_ID is required in production preflight.",
        "GOOGLE_CLIENT_SECRET is required in production preflight.",
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is required in production preflight.",
        "UPSTASH_REDIS_REST_URL is required in production preflight.",
        "UPSTASH_REDIS_REST_TOKEN is required in production preflight.",
        "R2_ACCOUNT_ID is required in production preflight.",
        "R2_ACCESS_KEY_ID is required in production preflight.",
        "R2_SECRET_ACCESS_KEY is required in production preflight.",
        "R2_BUCKET_STAGING is required in production preflight.",
        "R2_BUCKET_PUBLIC is required in production preflight.",
      ])
    );
  });

  it("rejects mismatched canonical app origins in production", () => {
    const result = validateProductionPreflight({
      BETTER_AUTH_SECRET: strongSecret,
      CRON_SECRET: strongSecret,
      DATABASE_URL: runtimeUrl,
      DATABASE_URL_DIRECT: ownerUrl,
      E2E_DATABASE_URL: e2eUrl,
      INTERNAL_R2_HEALTH_SECRET: strongSecret,
      PRODUCT_IMAGE_RECONCILE_SECRET: strongSecret,
      RLS_DATABASE_URL: runtimeUrl,
      VERCEL_ENV: "production",
      ...productionIntegrationEnv,
      NEXT_PUBLIC_APP_URL: "https://www.example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must use the same origin."
    );
  });

  it("rejects deployment smoke URL outside the canonical app origin", () => {
    const result = validateProductionPreflight({
      BETTER_AUTH_SECRET: strongSecret,
      CRON_SECRET: strongSecret,
      DATABASE_URL: runtimeUrl,
      DATABASE_URL_DIRECT: ownerUrl,
      E2E_DATABASE_URL: e2eUrl,
      INTERNAL_R2_HEALTH_SECRET: strongSecret,
      PRODUCT_IMAGE_RECONCILE_SECRET: strongSecret,
      RLS_DATABASE_URL: runtimeUrl,
      VERCEL_ENV: "production",
      ...productionIntegrationEnv,
      DEPLOYMENT_SMOKE_URL: "https://preview.example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "DEPLOYMENT_SMOKE_URL and NEXT_PUBLIC_APP_URL must use the same origin."
    );
  });

  it("rejects admin running on the public app origin", () => {
    const result = validateProductionPreflight({
      BETTER_AUTH_SECRET: strongSecret,
      CRON_SECRET: strongSecret,
      DATABASE_URL: runtimeUrl,
      DATABASE_URL_DIRECT: ownerUrl,
      E2E_DATABASE_URL: e2eUrl,
      INTERNAL_R2_HEALTH_SECRET: strongSecret,
      PRODUCT_IMAGE_RECONCILE_SECRET: strongSecret,
      RLS_DATABASE_URL: runtimeUrl,
      VERCEL_ENV: "production",
      ...productionIntegrationEnv,
      ADMIN_APP_URL: "https://app.example.com",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "ADMIN_APP_URL must use a separate origin from NEXT_PUBLIC_APP_URL."
    );
  });

  it("rejects production database URLs without verify-full sslmode", () => {
    const result = validateProductionPreflight({
      BETTER_AUTH_SECRET: strongSecret,
      CRON_SECRET: strongSecret,
      DATABASE_URL:
        "postgres://polaris_app:pass@runtime.example.neon.tech/neondb?sslmode=require",
      DATABASE_URL_DIRECT:
        "postgres://neondb_owner:pass@runtime.example.neon.tech/neondb?sslmode=require",
      E2E_DATABASE_URL:
        "postgres://polaris_app:pass@e2e.example.neon.tech/neondb?sslmode=require",
      INTERNAL_R2_HEALTH_SECRET: strongSecret,
      PRODUCT_IMAGE_RECONCILE_SECRET: strongSecret,
      RLS_DATABASE_URL:
        "postgres://polaris_app:pass@runtime.example.neon.tech/neondb?sslmode=require",
      VERCEL_ENV: "production",
      ...productionIntegrationEnv,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "DATABASE_URL must use sslmode=verify-full in production preflight.",
        "DATABASE_URL_DIRECT must use sslmode=verify-full in production preflight.",
        "E2E_DATABASE_URL must use sslmode=verify-full in production preflight.",
        "RLS_DATABASE_URL must use sslmode=verify-full in production preflight.",
      ])
    );
  });
});
