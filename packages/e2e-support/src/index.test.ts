import { describe, expect, it } from "vitest";
import {
  assertNoE2eProductionDotenvFiles,
  createE2eServerEnv,
  E2E_ADMIN_BASE_URL,
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  E2E_WEB_BASE_URL,
  parseE2eSetCookie,
  requireE2eDatabaseUrl,
  sanitizeE2eRunnerEnvironment,
} from "./index";

const isolatedDatabaseUrl =
  "postgres://runtime:runtime@127.0.0.1:5432/polaris_e2e_ci";

describe("E2E support", () => {
  it("requires an isolated database URL instead of falling back to DATABASE_URL", () => {
    expect(() =>
      requireE2eDatabaseUrl({ DATABASE_URL: "postgres://shared" })
    ).toThrow("E2E_DATABASE_URL");
  });

  it("rejects an E2E URL that targets a protected database alias", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        DATABASE_URL_DIRECT:
          "postgres://owner:secret@ep-production.neon.tech/polaris?sslmode=require",
        E2E_DATABASE_URL:
          "postgres://runtime:secret@ep-production-pooler.neon.tech/polaris?sslmode=require",
      })
    ).toThrow(
      "E2E_DATABASE_URL must target a separate PostgreSQL branch or database from DATABASE_URL_DIRECT."
    );
  });

  it("rejects an E2E URL that aliases the runtime DATABASE_URL target", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        DATABASE_URL:
          "postgres://runtime:secret@ep-production.neon.tech/polaris?sslmode=require",
        E2E_DATABASE_URL:
          "postgres://e2e:secret@ep-production-pooler.neon.tech/polaris?sslmode=verify-full",
      })
    ).toThrow(
      "E2E_DATABASE_URL must target a separate PostgreSQL branch or database from DATABASE_URL."
    );
  });

  it("requires E2E to use a different Neon branch even with another database name", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        DATABASE_URL:
          "postgres://runtime:secret@ep-production.neon.tech/neondb?sslmode=require",
        E2E_DATABASE_URL:
          "postgres://runtime:secret@ep-production-pooler.neon.tech/polaris_e2e_ci?sslmode=require",
      })
    ).toThrow(
      "E2E_DATABASE_URL must target a separate PostgreSQL branch or database from DATABASE_URL."
    );
  });

  it("matches protected database aliases case-insensitively", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        database_url_direct:
          "postgres://owner:secret@ep-production.neon.tech/polaris?sslmode=require",
        E2E_DATABASE_URL:
          "postgres://runtime:secret@ep-production-pooler.neon.tech/polaris?sslmode=require",
      })
    ).toThrow(
      "E2E_DATABASE_URL must target a separate PostgreSQL branch or database from DATABASE_URL_DIRECT."
    );
  });

  it("rejects the Neon owner role as an E2E runtime role", () => {
    expect(() =>
      requireE2eDatabaseUrl({
        E2E_DATABASE_URL:
          "postgres://neondb_owner:secret@ep-test.neon.tech/polaris_e2e_ci",
      })
    ).toThrow("E2E_DATABASE_URL must use a runtime role, not neondb_owner.");
  });

  it("accepts a runtime role on a distinct Neon branch", () => {
    expect(
      requireE2eDatabaseUrl({
        DATABASE_URL_DIRECT:
          "postgres://neondb_owner:secret@ep-production.neon.tech/polaris?sslmode=require",
        E2E_DATABASE_URL:
          "postgres://polaris_runtime:secret@ep-test-pooler.neon.tech/polaris_e2e_ci?sslmode=require",
      })
    ).toBe(
      "postgres://polaris_runtime:secret@ep-test-pooler.neon.tech/polaris_e2e_ci?sslmode=require"
    );
  });

  it("builds a deny-by-default app environment for the E2E server", () => {
    const parentEnvironment = {
      ADMIN_BETTER_AUTH_SECRET: "real-admin-secret",
      ASAAS_API_BASE_URL: "https://api.asaas.com/v3",
      ASAAS_API_KEY: "real-asaas-key",
      BETTER_AUTH_SECRET: "real-auth-secret",
      DATABASE_URL: "postgres://shared",
      DATABASE_URL_DIRECT: "postgres://migration-owner",
      E2E_DATABASE_URL: isolatedDatabaseUrl,
      E2E_INTERNAL_BOOTSTRAP_SECRET: "custom-e2e-secret",
      E2E_NAME: "Polaris E2E",
      CUSTOM_SERVICE_TOKEN: "unclassified-secret",
      INTERNAL_BOOTSTRAP_SECRET: "real-bootstrap-secret",
      NEXT_PUBLIC_APP_URL: "https://polaris.example.com",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.example/1",
      NEXT_PUBLIC_VERCEL_ENV: "production",
      PATH: "C:\\safe-path",
      R2_ACCESS_KEY_ID: "real-r2-key",
      R2_SECRET_ACCESS_KEY: "real-r2-secret",
      RLS_DATABASE_URL: "postgres://rls-owner",
      SENTRY_AUTH_TOKEN: "real-sentry-token",
      SENTRY_DSN: "https://private@sentry.example/1",
      SYSTEMROOT: "C:\\Windows",
      UPSTASH_REDIS_REST_TOKEN: "real-redis-token",
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      VERCEL_ENV: "production",
      WOOVI_API_BASE_URL: "https://api.woovi.com",
      WOOVI_API_KEY: "real-woovi-key",
    };

    const result = createE2eServerEnv(parentEnvironment, "web");

    expect(result).toMatchObject({
      ALLOW_PLAYWRIGHT_BOOTSTRAP: "true",
      APP_LOCAL_URL: E2E_WEB_BASE_URL,
      APP_URL_MODE: "local",
      BETTER_AUTH_SECRET: expect.not.stringContaining("real-auth-secret"),
      BETTER_AUTH_URL: E2E_WEB_BASE_URL,
      DATABASE_URL: isolatedDatabaseUrl,
      DATABASE_URL_DIRECT: "",
      E2E_DATABASE_URL: isolatedDatabaseUrl,
      INTERNAL_BOOTSTRAP_SECRET: E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
      NEXT_PUBLIC_APP_URL: E2E_WEB_BASE_URL,
      NEXT_PUBLIC_SENTRY_DSN: "",
      NEXT_PUBLIC_VERCEL_ENV: "",
      PATH: "C:\\safe-path",
      R2_ACCESS_KEY_ID: "",
      R2_SECRET_ACCESS_KEY: "",
      RLS_DATABASE_URL: "",
      SENTRY_AUTH_TOKEN: "",
      SENTRY_DSN: "",
      SYSTEMROOT: "C:\\Windows",
      UPSTASH_REDIS_REST_TOKEN: "",
      UPSTASH_REDIS_REST_URL: "",
      VERCEL_ENV: "",
      WOOVI_API_BASE_URL: "",
      WOOVI_API_KEY: "",
    });
    expect(result.ADMIN_BETTER_AUTH_SECRET).not.toBe("real-admin-secret");
    expect(result.ASAAS_API_BASE_URL).toBe("");
    expect(result.ASAAS_API_KEY).toBe("");
    expect(result.CUSTOM_SERVICE_TOKEN).toBe("");
    expect(result.E2E_INTERNAL_BOOTSTRAP_SECRET).toBe("");
    expect(result.E2E_NAME).toBe("");
    expect(result.GOOGLE_CLIENT_ID).toBe("dummy-google-client-id");
    expect(result.GOOGLE_CLIENT_SECRET).toBe("dummy-google-client-secret");
    expect(result.INNGEST_EVENT_KEY).toBe("");
    expect(result.PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH).toBe("");
    expect(result.NEXT_PUBLIC_GOOGLE_CLIENT_ID).toBe("dummy-google-client-id");
  });

  it("uses distinct loopback origins for Web and Admin E2E servers", () => {
    const env = { E2E_DATABASE_URL: isolatedDatabaseUrl };

    expect(createE2eServerEnv(env, "web")).toMatchObject({
      ADMIN_APP_URL: E2E_ADMIN_BASE_URL,
      BETTER_AUTH_URL: E2E_WEB_BASE_URL,
      INTERNAL_BOOTSTRAP_SECRET: E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
    });
    expect(createE2eServerEnv(env, "admin")).toMatchObject({
      ADMIN_APP_URL: E2E_ADMIN_BASE_URL,
      BETTER_AUTH_URL: E2E_ADMIN_BASE_URL,
      INTERNAL_BOOTSTRAP_SECRET: E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
      NEXT_PUBLIC_APP_URL: E2E_WEB_BASE_URL,
    });
  });

  it("removes credentials and database URLs from Playwright workers", () => {
    const environment = {
      ASAAS_API_KEY: "real-asaas-key",
      CI: "true",
      DATABASE_URL: "postgres://production",
      E2E_DATABASE_URL: isolatedDatabaseUrl,
      E2E_INTERNAL_BOOTSTRAP_SECRET: "custom-e2e-secret",
      E2E_NAME: "Polaris E2E",
      GITHUB_ACTIONS: "true",
      GITHUB_TOKEN: "workflow-token",
      NODE_ENV: "test",
      PATH: "C:\\safe-path",
      PLAYWRIGHT_BROWSERS_PATH: "C:\\browser-cache",
      SENTRY_DSN: "https://private@sentry.example/1",
    };

    sanitizeE2eRunnerEnvironment(environment);

    expect(environment).toEqual({
      CI: "true",
      E2E_NAME: "Polaris E2E",
      GITHUB_ACTIONS: "true",
      NODE_ENV: "test",
      PATH: "C:\\safe-path",
      PLAYWRIGHT_BROWSERS_PATH: "C:\\browser-cache",
    });
  });

  it("rejects production dotenv files that Next would load after sanitization", () => {
    expect(() =>
      assertNoE2eProductionDotenvFiles([".env.production.local"])
    ).toThrow("Playwright E2E cannot run with production dotenv files;");
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
