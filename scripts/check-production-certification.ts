export interface ProductionCertificationEnv {
  PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT?: string;
  PRODUCTION_CERT_INNGEST_RECONCILE_CRON?: string;
  PRODUCTION_CERT_INNGEST_SYNC_AT?: string;
  PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS?: string;
  PRODUCTION_CERT_MANUAL_BILLING_SOP_AT?: string;
  PRODUCTION_CERT_PROVIDER_SANDBOX_AT?: string;
  PRODUCTION_CERT_QUERY_PLAN_AT?: string;
  PRODUCTION_CERT_R2_HEALTH_AT?: string;
  PRODUCTION_CERT_RESTORE_DRILL_AT?: string;
  PRODUCTION_CERT_RLS_FORCED_TABLES?: string;
  PRODUCTION_CERT_SENTRY_ALERT_AT?: string;
  PRODUCTION_CERT_SENTRY_EVENT_ID?: string;
  PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT?: string;
  PRODUCTION_CERT_VALIDATED_BY?: string;
}

const REQUIRED_ENV_NAMES = [
  "PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT",
  "PRODUCTION_CERT_INNGEST_SYNC_AT",
  "PRODUCTION_CERT_INNGEST_RECONCILE_CRON",
  "PRODUCTION_CERT_MANUAL_BILLING_SOP_AT",
  "PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS",
  "PRODUCTION_CERT_PROVIDER_SANDBOX_AT",
  "PRODUCTION_CERT_QUERY_PLAN_AT",
  "PRODUCTION_CERT_R2_HEALTH_AT",
  "PRODUCTION_CERT_RESTORE_DRILL_AT",
  "PRODUCTION_CERT_RLS_FORCED_TABLES",
  "PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT",
  "PRODUCTION_CERT_SENTRY_EVENT_ID",
  "PRODUCTION_CERT_SENTRY_ALERT_AT",
  "PRODUCTION_CERT_VALIDATED_BY",
] as const satisfies ReadonlyArray<keyof ProductionCertificationEnv>;

const TIMESTAMP_ENV_NAMES = [
  "PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT",
  "PRODUCTION_CERT_INNGEST_SYNC_AT",
  "PRODUCTION_CERT_MANUAL_BILLING_SOP_AT",
  "PRODUCTION_CERT_PROVIDER_SANDBOX_AT",
  "PRODUCTION_CERT_QUERY_PLAN_AT",
  "PRODUCTION_CERT_R2_HEALTH_AT",
  "PRODUCTION_CERT_RESTORE_DRILL_AT",
  "PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT",
  "PRODUCTION_CERT_SENTRY_ALERT_AT",
] as const satisfies ReadonlyArray<keyof ProductionCertificationEnv>;

const EXPECTED_INNGEST_RECONCILE_CRON = "0 4 * * *";
const EXPECTED_RLS_FORCED_TABLES = "18/18";
const SENTRY_EVENT_ID_PATTERN = /^[a-f0-9]{32}$/;

const isMissing = (
  env: ProductionCertificationEnv,
  name: keyof ProductionCertificationEnv
): boolean => !env[name]?.trim();

const assertIsoTimestamp = (
  env: ProductionCertificationEnv,
  name: keyof ProductionCertificationEnv
): void => {
  const value = env[name];
  const parsed = new Date(value as string);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${name} must be an ISO timestamp.`);
  }
};

export const validateProductionCertificationEnv = (
  env: ProductionCertificationEnv
): void => {
  const missing = REQUIRED_ENV_NAMES.filter((name) => isMissing(env, name));

  if (missing.length > 0) {
    throw new Error(
      `Production certification evidence is incomplete. Missing: ${missing.join(
        ", "
      )}.`
    );
  }

  for (const name of TIMESTAMP_ENV_NAMES) {
    assertIsoTimestamp(env, name);
  }

  if (
    env.PRODUCTION_CERT_INNGEST_RECONCILE_CRON !==
    EXPECTED_INNGEST_RECONCILE_CRON
  ) {
    throw new Error(
      `PRODUCTION_CERT_INNGEST_RECONCILE_CRON must be ${EXPECTED_INNGEST_RECONCILE_CRON}.`
    );
  }

  if (env.PRODUCTION_CERT_RLS_FORCED_TABLES !== EXPECTED_RLS_FORCED_TABLES) {
    throw new Error("PRODUCTION_CERT_RLS_FORCED_TABLES must be 18/18.");
  }

  if (
    !SENTRY_EVENT_ID_PATTERN.test(env.PRODUCTION_CERT_SENTRY_EVENT_ID ?? "")
  ) {
    throw new Error(
      "PRODUCTION_CERT_SENTRY_EVENT_ID must be a 32-character Sentry event id."
    );
  }
};

if (import.meta.main) {
  try {
    validateProductionCertificationEnv(
      process.env as ProductionCertificationEnv
    );
    console.log(
      JSON.stringify(
        {
          adminVercelAuthAt: process.env.PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT,
          inngestReconcileCron:
            process.env.PRODUCTION_CERT_INNGEST_RECONCILE_CRON,
          inngestSyncAt: process.env.PRODUCTION_CERT_INNGEST_SYNC_AT,
          providerSandboxAt: process.env.PRODUCTION_CERT_PROVIDER_SANDBOX_AT,
          queryPlanAt: process.env.PRODUCTION_CERT_QUERY_PLAN_AT,
          r2HealthAt: process.env.PRODUCTION_CERT_R2_HEALTH_AT,
          restoreDrillAt: process.env.PRODUCTION_CERT_RESTORE_DRILL_AT,
          rlsForcedTables: process.env.PRODUCTION_CERT_RLS_FORCED_TABLES,
          sentryAlertAt: process.env.PRODUCTION_CERT_SENTRY_ALERT_AT,
          sentryEventId: process.env.PRODUCTION_CERT_SENTRY_EVENT_ID,
          upstashRateLimitAt: process.env.PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT,
          validatedBy: process.env.PRODUCTION_CERT_VALIDATED_BY,
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
