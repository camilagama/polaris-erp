import {
  type ProductionPreflightEnv,
  validateProductionPreflight,
} from "../apps/web/src/lib/production-preflight";

const env: ProductionPreflightEnv = {
  ADMIN_APP_URL: process.env.ADMIN_APP_URL,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: process.env.ALLOW_PLAYWRIGHT_BOOTSTRAP,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  CLOUDFLARE_ACCESS_AUD: process.env.CLOUDFLARE_ACCESS_AUD,
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
  CRON_SECRET: process.env.CRON_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
  DEPLOYMENT_SMOKE_URL: process.env.DEPLOYMENT_SMOKE_URL,
  E2E_DATABASE_URL: process.env.E2E_DATABASE_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  INTERNAL_R2_HEALTH_SECRET: process.env.INTERNAL_R2_HEALTH_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  PRODUCT_IMAGE_RECONCILE_SECRET: process.env.PRODUCT_IMAGE_RECONCILE_SECRET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET_PUBLIC: process.env.R2_BUCKET_PUBLIC,
  R2_BUCKET_STAGING: process.env.R2_BUCKET_STAGING,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  RLS_DATABASE_URL: process.env.RLS_DATABASE_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
};

const result = validateProductionPreflight(env);

if (!result.ok) {
  console.error(
    [
      "Production preflight failed:",
      ...result.errors.map((error) => `- ${error}`),
    ].join("\n")
  );
  process.exit(1);
}

console.log("production-preflight-ok");
