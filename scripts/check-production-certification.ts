export interface ProductionCertificationEnv {
  PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT?: string;
  PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED?: string;
  PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY?: string;
  PRODUCTION_CERT_ASAAS_SANDBOX_AT?: string;
  PRODUCTION_CERT_INNGEST_RECONCILE_CRON?: string;
  PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID?: string;
  PRODUCTION_CERT_INNGEST_SYNC_AT?: string;
  PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS?: string;
  PRODUCTION_CERT_MANUAL_BILLING_SOP_AT?: string;
  PRODUCTION_CERT_NEON_POOLER_ENABLED?: string;
  PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED?: string;
  PRODUCTION_CERT_PROVIDER_SANDBOX_AT?: string;
  PRODUCTION_CERT_QUERY_PLAN_AT?: string;
  PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS?: string;
  PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM?: string;
  PRODUCTION_CERT_R2_HEALTH_AT?: string;
  PRODUCTION_CERT_RESTORE_DRILL_AT?: string;
  PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH?: string;
  PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH?: string;
  PRODUCTION_CERT_RLS_FORCED_TABLES?: string;
  PRODUCTION_CERT_SENTRY_ALERT_AT?: string;
  PRODUCTION_CERT_SENTRY_EVENT_ID?: string;
  PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT?: string;
  PRODUCTION_CERT_VALIDATED_BY?: string;
  PRODUCTION_CERT_WOOVI_SANDBOX_AT?: string;
}

const REQUIRED_ENV_NAMES = [
  "PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT",
  "PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY",
  "PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED",
  "PRODUCTION_CERT_ASAAS_SANDBOX_AT",
  "PRODUCTION_CERT_INNGEST_SYNC_AT",
  "PRODUCTION_CERT_INNGEST_RECONCILE_CRON",
  "PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID",
  "PRODUCTION_CERT_MANUAL_BILLING_SOP_AT",
  "PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS",
  "PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED",
  "PRODUCTION_CERT_NEON_POOLER_ENABLED",
  "PRODUCTION_CERT_PROVIDER_SANDBOX_AT",
  "PRODUCTION_CERT_QUERY_PLAN_AT",
  "PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS",
  "PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM",
  "PRODUCTION_CERT_R2_HEALTH_AT",
  "PRODUCTION_CERT_RESTORE_DRILL_AT",
  "PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH",
  "PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH",
  "PRODUCTION_CERT_RLS_FORCED_TABLES",
  "PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT",
  "PRODUCTION_CERT_SENTRY_EVENT_ID",
  "PRODUCTION_CERT_SENTRY_ALERT_AT",
  "PRODUCTION_CERT_VALIDATED_BY",
  "PRODUCTION_CERT_WOOVI_SANDBOX_AT",
] as const satisfies ReadonlyArray<keyof ProductionCertificationEnv>;

const TIMESTAMP_ENV_NAMES = [
  "PRODUCTION_CERT_ADMIN_VERCEL_AUTH_AT",
  "PRODUCTION_CERT_ASAAS_SANDBOX_AT",
  "PRODUCTION_CERT_INNGEST_SYNC_AT",
  "PRODUCTION_CERT_MANUAL_BILLING_SOP_AT",
  "PRODUCTION_CERT_PROVIDER_SANDBOX_AT",
  "PRODUCTION_CERT_QUERY_PLAN_AT",
  "PRODUCTION_CERT_R2_HEALTH_AT",
  "PRODUCTION_CERT_RESTORE_DRILL_AT",
  "PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT",
  "PRODUCTION_CERT_SENTRY_ALERT_AT",
  "PRODUCTION_CERT_WOOVI_SANDBOX_AT",
] as const satisfies ReadonlyArray<keyof ProductionCertificationEnv>;

const EXPECTED_INNGEST_RECONCILE_CRON = "0 4 * * *";
const EXPECTED_INNGEST_RECONCILE_FUNCTION_ID = "reconcile-product-images";
const EXPECTED_ADMIN_VERCEL_ROOT_DIRECTORY = "apps/admin";
const EXPECTED_RLS_FORCED_TABLES = "18/18";
const MIN_QUERY_PLAN_ROWS = 500;
const MAX_MANUAL_BILLING_SLA_HOURS = 48;
const MIN_MANUAL_BILLING_SLA_HOURS = 1;
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
    env.PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY !==
    EXPECTED_ADMIN_VERCEL_ROOT_DIRECTORY
  ) {
    throw new Error(
      `PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY must be ${EXPECTED_ADMIN_VERCEL_ROOT_DIRECTORY}.`
    );
  }

  if (env.PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED !== "true") {
    throw new Error(
      "PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED must be true."
    );
  }

  if (
    env.PRODUCTION_CERT_INNGEST_RECONCILE_CRON !==
    EXPECTED_INNGEST_RECONCILE_CRON
  ) {
    throw new Error(
      `PRODUCTION_CERT_INNGEST_RECONCILE_CRON must be ${EXPECTED_INNGEST_RECONCILE_CRON}.`
    );
  }

  if (
    env.PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID !==
    EXPECTED_INNGEST_RECONCILE_FUNCTION_ID
  ) {
    throw new Error(
      `PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID must be ${EXPECTED_INNGEST_RECONCILE_FUNCTION_ID}.`
    );
  }

  const manualBillingSlaHours = Number(
    env.PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS
  );

  if (
    !Number.isInteger(manualBillingSlaHours) ||
    manualBillingSlaHours < MIN_MANUAL_BILLING_SLA_HOURS ||
    manualBillingSlaHours > MAX_MANUAL_BILLING_SLA_HOURS
  ) {
    throw new Error(
      "PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS must be an integer from 1 to 48."
    );
  }

  if (env.PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED !== "true") {
    throw new Error(
      "PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED must be true."
    );
  }

  if (env.PRODUCTION_CERT_NEON_POOLER_ENABLED !== "true") {
    throw new Error("PRODUCTION_CERT_NEON_POOLER_ENABLED must be true.");
  }

  const queryPlanMinRows = Number(env.PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS);

  if (
    !Number.isInteger(queryPlanMinRows) ||
    queryPlanMinRows < MIN_QUERY_PLAN_ROWS
  ) {
    throw new Error(
      "PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS must be at least 500."
    );
  }

  if (
    env.PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH ===
    env.PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH
  ) {
    throw new Error(
      "PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH must be a restored validation branch, not the source branch."
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
          adminVercelOutsideRootIncluded:
            process.env.PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED,
          adminVercelRootDirectory:
            process.env.PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY,
          asaasSandboxAt: process.env.PRODUCTION_CERT_ASAAS_SANDBOX_AT,
          inngestReconcileCron:
            process.env.PRODUCTION_CERT_INNGEST_RECONCILE_CRON,
          inngestReconcileFunctionId:
            process.env.PRODUCTION_CERT_INNGEST_RECONCILE_FUNCTION_ID,
          inngestSyncAt: process.env.PRODUCTION_CERT_INNGEST_SYNC_AT,
          manualBillingSlaHours:
            process.env.PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS,
          manualBillingSopAt: process.env.PRODUCTION_CERT_MANUAL_BILLING_SOP_AT,
          neonPoolerEnabled: process.env.PRODUCTION_CERT_NEON_POOLER_ENABLED,
          neonProductionBranchProtected:
            process.env.PRODUCTION_CERT_NEON_PRODUCTION_BRANCH_PROTECTED,
          providerSandboxAt: process.env.PRODUCTION_CERT_PROVIDER_SANDBOX_AT,
          queryPlanAt: process.env.PRODUCTION_CERT_QUERY_PLAN_AT,
          queryPlanMinRows: process.env.PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS,
          queryPlanSearchTerm:
            process.env.PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM,
          r2HealthAt: process.env.PRODUCTION_CERT_R2_HEALTH_AT,
          restoreDrillAt: process.env.PRODUCTION_CERT_RESTORE_DRILL_AT,
          restoreDrillRestoreBranch:
            process.env.PRODUCTION_CERT_RESTORE_DRILL_RESTORE_BRANCH,
          restoreDrillSourceBranch:
            process.env.PRODUCTION_CERT_RESTORE_DRILL_SOURCE_BRANCH,
          rlsForcedTables: process.env.PRODUCTION_CERT_RLS_FORCED_TABLES,
          sentryAlertAt: process.env.PRODUCTION_CERT_SENTRY_ALERT_AT,
          sentryEventId: process.env.PRODUCTION_CERT_SENTRY_EVENT_ID,
          upstashRateLimitAt: process.env.PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT,
          validatedBy: process.env.PRODUCTION_CERT_VALIDATED_BY,
          wooviSandboxAt: process.env.PRODUCTION_CERT_WOOVI_SANDBOX_AT,
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
