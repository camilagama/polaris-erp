import { describe, expect, it } from "vitest";
import { validateProductionCertificationEnv } from "../../../../scripts/check-production-certification";
import { validateRestoreDrillEnv } from "../../../../scripts/check-restore-drill";
import { validateMigrationDatabaseEnv } from "../../../../scripts/require-database-url-direct";

describe("migration operation gates", () => {
  it("requires DATABASE_URL_DIRECT for migrations", () => {
    expect(() => validateMigrationDatabaseEnv({})).toThrow(
      "DATABASE_URL_DIRECT is required"
    );
  });

  it("rejects reusing the runtime database URL for migrations", () => {
    expect(() =>
      validateMigrationDatabaseEnv({
        DATABASE_URL: "postgres://runtime.example.com/app",
        DATABASE_URL_DIRECT: "postgres://runtime.example.com/app",
      })
    ).toThrow("must be separate from DATABASE_URL");
  });

  it("returns a redacted migration target for valid direct URLs", () => {
    expect(
      validateMigrationDatabaseEnv({
        DATABASE_URL: "postgres://runtime.example.com/app",
        DATABASE_URL_DIRECT:
          "postgres://owner:secret@direct.example.com:5432/app",
      })
    ).toBe("postgres://direct.example.com:5432/app");
  });
});

describe("restore drill checklist", () => {
  it("requires explicit restore drill evidence", () => {
    expect(() => validateRestoreDrillEnv({})).toThrow(
      "Restore drill evidence is incomplete"
    );
  });

  it("requires a restored branch distinct from the source branch", () => {
    expect(() =>
      validateRestoreDrillEnv({
        RESTORE_DRILL_CONFIRMED_AT: "2026-07-10T12:00:00.000Z",
        RESTORE_DRILL_RESTORE_BRANCH: "production",
        RESTORE_DRILL_SOURCE_BRANCH: "production",
        RESTORE_DRILL_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow("must be a restored validation branch");
  });

  it("accepts complete restore drill evidence", () => {
    expect(() =>
      validateRestoreDrillEnv({
        RESTORE_DRILL_CONFIRMED_AT: "2026-07-10T12:00:00.000Z",
        RESTORE_DRILL_RESTORE_BRANCH: "production-restore-drill-20260710",
        RESTORE_DRILL_SOURCE_BRANCH: "production",
        RESTORE_DRILL_VALIDATED_BY: "ops@example.com",
      })
    ).not.toThrow();
  });
});

describe("production certification checklist", () => {
  it("requires explicit evidence for external production gates", () => {
    expect(() => validateProductionCertificationEnv({})).toThrow(
      "Production certification evidence is incomplete"
    );
  });

  it("requires RLS smoke to cover all enforced tables", () => {
    expect(() =>
      validateProductionCertificationEnv({
        PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_SYNC_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_RECONCILE_CRON: "0 4 * * *",
        PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS: "24",
        PRODUCTION_CERT_MANUAL_BILLING_SOP_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_PROVIDER_SANDBOX_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_QUERY_PLAN_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_R2_HEALTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RESTORE_DRILL_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RLS_FORCED_TABLES: "17/18",
        PRODUCTION_CERT_SENTRY_ALERT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_SENTRY_EVENT_ID: "0123456789abcdef0123456789abcdef",
        PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow("PRODUCTION_CERT_RLS_FORCED_TABLES must be 18/18.");
  });

  it("requires explicit observability evidence for R2, Upstash, and Sentry", () => {
    expect(() =>
      validateProductionCertificationEnv({
        PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_SYNC_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_RECONCILE_CRON: "0 4 * * *",
        PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS: "24",
        PRODUCTION_CERT_MANUAL_BILLING_SOP_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_PROVIDER_SANDBOX_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_QUERY_PLAN_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RESTORE_DRILL_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RLS_FORCED_TABLES: "18/18",
        PRODUCTION_CERT_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow(
      "Missing: PRODUCTION_CERT_R2_HEALTH_AT, PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT, PRODUCTION_CERT_SENTRY_EVENT_ID, PRODUCTION_CERT_SENTRY_ALERT_AT"
    );
  });

  it("requires manual billing SOP and SLA evidence while checkout is manual", () => {
    expect(() =>
      validateProductionCertificationEnv({
        PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_SYNC_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_RECONCILE_CRON: "0 4 * * *",
        PRODUCTION_CERT_PROVIDER_SANDBOX_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_QUERY_PLAN_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_R2_HEALTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RESTORE_DRILL_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RLS_FORCED_TABLES: "18/18",
        PRODUCTION_CERT_SENTRY_ALERT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_SENTRY_EVENT_ID: "0123456789abcdef0123456789abcdef",
        PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow(
      "Missing: PRODUCTION_CERT_MANUAL_BILLING_SOP_AT, PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS"
    );
  });

  it("requires a concrete Sentry event id, not only a timestamp", () => {
    expect(() =>
      validateProductionCertificationEnv({
        PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_SYNC_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_RECONCILE_CRON: "0 4 * * *",
        PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS: "24",
        PRODUCTION_CERT_MANUAL_BILLING_SOP_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_PROVIDER_SANDBOX_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_QUERY_PLAN_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_R2_HEALTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RESTORE_DRILL_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RLS_FORCED_TABLES: "18/18",
        PRODUCTION_CERT_SENTRY_ALERT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_SENTRY_EVENT_ID: "not-an-event-id",
        PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_VALIDATED_BY: "ops@example.com",
      })
    ).toThrow(
      "PRODUCTION_CERT_SENTRY_EVENT_ID must be a 32-character Sentry event id."
    );
  });

  it("accepts complete production certification evidence", () => {
    expect(() =>
      validateProductionCertificationEnv({
        PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_SYNC_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_INNGEST_RECONCILE_CRON: "0 4 * * *",
        PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS: "24",
        PRODUCTION_CERT_MANUAL_BILLING_SOP_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_PROVIDER_SANDBOX_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_QUERY_PLAN_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_R2_HEALTH_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RESTORE_DRILL_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_RLS_FORCED_TABLES: "18/18",
        PRODUCTION_CERT_SENTRY_ALERT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_SENTRY_EVENT_ID: "0123456789abcdef0123456789abcdef",
        PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT: "2026-07-11T12:00:00.000Z",
        PRODUCTION_CERT_VALIDATED_BY: "ops@example.com",
      })
    ).not.toThrow();
  });
});
