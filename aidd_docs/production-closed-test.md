---
status: historical
snapshot_date: 2026-07-12
---

# Closed Production Test Runbook

Last updated: 2026-07-12

> **Historical snapshot — 2026-07-12.** This file records one closed test run. Its Vercel/Neon IDs, hosts, environment names, webhook URLs, and commands are historical; they do not verify current provider state and must not be used to configure services, run migrations, or deploy/promote. For current status and evidence, see [Production Readiness (P43)](../docs/operations/production-readiness.md). For current procedures, use the [Vercel deployment runbook](../docs/runbooks/deploy-vercel.md), [Production migrations runbook](../docs/runbooks/production-migrations.md), and [backup and recovery runbook](../docs/runbooks/backup-and-recovery.md).

## Current State

- Vercel team: `summit-studios-projects`
- Web Vercel project: `polaris-web-closed`
  - Project ID: `prj_4XRRdK4cN40iCd57oqshPLsTxnXN`
  - Root Directory: `.`
  - Install Command: `bun install`
  - Build Command: `bun run build`
  - Output Directory: `apps/web/.next`
  - SSO deployment protection: enabled
- Admin Vercel project: `polaris-admin-closed`
  - Project ID: `prj_ZyOJu3MHO9LcgnEyXx78ELBJ9IDS`
  - Root Directory: `.`
  - Install Command: `bun install`
  - Build Command: `bun run build:admin`
  - Output Directory: `apps/admin/.next`
  - SSO deployment protection: enabled
- Generated Vercel envs already configured on both projects:
  - `ALLOW_PLAYWRIGHT_BOOTSTRAP`
  - `BETTER_AUTH_API_KEY`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `ADMIN_APP_URL`
  - `DEPLOYMENT_SMOKE_URL`
  - `DATABASE_POOL_MAX`
  - `INTERNAL_BOOTSTRAP_SECRET`
  - `INTERNAL_R2_HEALTH_SECRET`
  - `PRODUCT_IMAGE_RECONCILE_SECRET`
  - `R2_BUCKET_STAGING`
  - `R2_BUCKET_PUBLIC`
  - `SENTRY_TRACES_SAMPLE_RATE`
  - `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
  - `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
  - `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`
- Vercel envs derived from the local project env and configured on both projects:
  - `DATABASE_URL`
  - `DATABASE_URL_DIRECT`
  - `RLS_DATABASE_URL`
  - `E2E_DATABASE_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - `SUPPORT_EMAIL`
- Admin-only generated Vercel envs already configured:
  - `ADMIN_DEPLOYMENT_SMOKE_URL`
  - `ADMIN_DEPLOYMENT_SMOKE_PROTECTED`
- Neon project: `polaris-erp`
  - Project ID: `autumn-feather-14038163`
  - Region: `aws-sa-east-1`
  - Default branch: `production` / `br-empty-frog-acrcn1aj`
  - Closed test branch: `closed-prod-test-2026-07-12` / `br-floral-forest-accca2ir`
  - Closed test host: `ep-super-smoke-acfkocq3.sa-east-1.aws.neon.tech`
  - Closed test pooled host: `ep-super-smoke-acfkocq3-pooler.sa-east-1.aws.neon.tech`

## Blocking Before Deployment

Do not deploy production until these are resolved:

- `scripts/check-production-readiness.ts` and `bun run prod:preflight` require Inngest, Upstash, R2, and Sentry envs when `VERCEL_ENV=production`.
- Production preflight still fails locally when using `.env.local`; Vercel has newer generated/derived envs that are not written back to local files.
- Neon `production` branch is not protected.
- Neon pooler is disabled for the visible computes.
- R2 credentials are missing from both Vercel projects.
- R2 public base URL is missing from both Vercel projects.
- Upstash REST URL/token are missing from both Vercel projects.
- Inngest event/signing keys are missing from both Vercel projects.
- Sentry DSNs are missing from both Vercel projects; Sentry auth token is also needed for sourcemap uploads.
- Resend API key is missing from both Vercel projects; this blocks complete email workflow testing.
- Woovi and Asaas envs are missing from both Vercel projects; this blocks complete payment workflow testing.
- Google OAuth credentials are configured in Vercel, but Google Cloud Console still needs the Vercel callback URLs before login can work there.

Connector audit:

- Available and used: Vercel, Neon, Resend.
- Not available as actionable tools in this session: Cloudflare R2, Inngest, Upstash, Sentry project/env/alert management.
- Resend can create a new API key, but the token is shown only once and should be handled as a secret. Existing key names are visible, but secret values cannot be retrieved.
- Resend domain `agenciasummit.com` has sending enabled. DKIM and SPF are verified; tracking CNAME `app -> links1.resend-dns.com` is pending after a verification retry.
- Resend production webhook created: `https://polaris-web-closed-summit-studios-projects.vercel.app/api/webhooks/resend`.
- `RESEND_FROM_EMAIL` and `RESEND_WEBHOOK_SECRET` are configured on both Vercel projects.
- Local `.env.local` contains these keys but they are empty: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- The extra app connector exposed only Sites and Resend utilities for this task; it did not expose R2, Inngest, Upstash, or Sentry setup tools.

## Remaining Required Vercel Envs

These are still missing from both `polaris-web-closed` and `polaris-admin-closed`:

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `RESEND_API_KEY`
- `WOOVI_API_BASE_URL`
- `WOOVI_API_KEY`
- `WOOVI_WEBHOOK_SECRET`
- `ASAAS_API_BASE_URL`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`

## Required Vercel Envs

Set the following on both `polaris-web-closed` and `polaris-admin-closed` unless noted:

- `DATABASE_URL`: Neon runtime role, pooled when pooler is enabled, `sslmode=verify-full`
- `DATABASE_URL_DIRECT`: Neon migration/direct role, non-pooled, `sslmode=verify-full`
- `RLS_DATABASE_URL`: restricted runtime role without owner privileges, `sslmode=verify-full`
- `E2E_DATABASE_URL`: isolated e2e branch or closed test branch, not equal to runtime URLs, `sslmode=verify-full`
- `DATABASE_POOL_MAX`: conservative production pool size, for example `5`
- `BETTER_AUTH_SECRET`: at least 32 characters
- `BETTER_AUTH_API_KEY`
- `BETTER_AUTH_URL`: final web origin
- `NEXT_PUBLIC_APP_URL`: final web origin
- `ADMIN_APP_URL`: final admin origin
- `DEPLOYMENT_SMOKE_URL`: final web origin
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_STAGING`
- `R2_BUCKET_PUBLIC`
- `R2_PUBLIC_BASE_URL`
- `INTERNAL_R2_HEALTH_SECRET`: at least 32 characters
- `PRODUCT_IMAGE_RECONCILE_SECRET`: at least 32 characters
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_WEBHOOK_SECRET`
- `SUPPORT_EMAIL`
- `WOOVI_API_BASE_URL`
- `WOOVI_API_KEY`
- `WOOVI_WEBHOOK_SECRET`
- `ASAAS_API_BASE_URL`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`

Set admin-only smoke envs on `polaris-admin-closed`:

- `ADMIN_DEPLOYMENT_SMOKE_URL`: final admin origin
- `ADMIN_DEPLOYMENT_SMOKE_PROTECTED`: `true` if SSO/Vercel Authentication blocks `/api/health`

## Manual Setup Steps

1. Neon
   - Open Neon project `polaris-erp`.
   - Protect branch `production`.
   - Enable pooler for production runtime connections.
   - Create or confirm a runtime database role without `BYPASSRLS` and without owner privileges.
   - Generate connection strings for production and closed test with `sslmode=verify-full`.
   - Use direct non-pooled URL only for `DATABASE_URL_DIRECT`.
   - For the closed test branch, use host `ep-super-smoke-acfkocq3.sa-east-1.aws.neon.tech`.
   - Use the pooled host only after pooler is enabled: `ep-super-smoke-acfkocq3-pooler.sa-east-1.aws.neon.tech`.

2. Cloudflare R2
   - Create bucket `polaris-product-images-staging`.
   - Create bucket `polaris-product-images-public`.
   - Create an R2 API token/key allowed to read/write those buckets.
   - Configure lifecycle cleanup for staged objects.
   - Set a public base URL or custom domain for public image reads.
   - Save values into Vercel envs listed above.

3. Upstash
   - Create a Redis database for production/closed test.
   - Copy REST URL and REST token into both Vercel projects.

4. Inngest
   - Create or select the production app.
   - Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
   - Sync endpoint after deploy: `https://<web-origin>/api/inngest`.
   - Confirm function `reconcile-product-images` exists.
   - Confirm cron schedule `0 4 * * *`.

5. Sentry
   - Create or select Sentry projects for web/admin, or one shared project if that is intentional.
   - Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`.
   - Create an alert for unresolved production errors.
   - Trigger one controlled test event and record the 32-character event ID in `PRODUCTION_CERT_SENTRY_EVENT_ID`.

6. Resend
   - Use existing key `Polaris Freela` only if it is intended for this app, or create a new sending key.
   - Store the key as `RESEND_API_KEY` in both Vercel projects.
   - Confirm `agenciasummit.com` finishes verification.
   - If tracking remains pending, add DNS CNAME `app.agenciasummit.com -> links1.resend-dns.com`.
   - Current sender env is `Polaris <contato@agenciasummit.com>`.
   - Production webhook is already created for `https://polaris-web-closed-summit-studios-projects.vercel.app/api/webhooks/resend`.

7. OAuth
   - Add web callback URL: `https://<web-origin>/api/auth/callback/google`.
   - Add any preview/test callback URLs used for closed testing.
   - Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` match.

8. Payments
   - Configure Woovi sandbox/prod credentials and webhook secret.
   - Configure Asaas sandbox/prod credentials and webhook token.
   - Confirm webhook URLs after deployment:
     - `https://<web-origin>/api/webhooks/woovi`
     - `https://<web-origin>/api/webhooks/asaas`

## Add Remaining Envs From PowerShell

Use this helper after collecting the missing values. Replace only the `<...>` placeholders.

```powershell
function Add-PolarisVercelEnv($projectId, $key, $value) {
  $body = @{
    key = $key
    value = $value
    type = "encrypted"
    target = @("production", "preview", "development")
  } | ConvertTo-Json -Compress

  $tmp = New-TemporaryFile
  Set-Content -LiteralPath $tmp -Value $body -NoNewline
  npx vercel@latest api "/v10/projects/$projectId/env" `
    --scope summit-studios-projects `
    --method POST `
    --input $tmp `
    --silent
  Remove-Item -LiteralPath $tmp -Force
}

$projects = @(
  "prj_4XRRdK4cN40iCd57oqshPLsTxnXN",
  "prj_ZyOJu3MHO9LcgnEyXx78ELBJ9IDS"
)

$envs = @{
  INNGEST_EVENT_KEY = "<inngest event key>"
  INNGEST_SIGNING_KEY = "<inngest signing key>"
  UPSTASH_REDIS_REST_URL = "<upstash redis rest url>"
  UPSTASH_REDIS_REST_TOKEN = "<upstash redis rest token>"
  R2_ACCOUNT_ID = "<cloudflare account id>"
  R2_ACCESS_KEY_ID = "<r2 access key id>"
  R2_SECRET_ACCESS_KEY = "<r2 secret access key>"
  R2_PUBLIC_BASE_URL = "<r2 public base url or custom domain>"
  SENTRY_DSN = "<sentry server dsn>"
  NEXT_PUBLIC_SENTRY_DSN = "<sentry browser dsn>"
  SENTRY_AUTH_TOKEN = "<sentry auth token for sourcemaps>"
  SENTRY_ORG = "<sentry org slug>"
  SENTRY_PROJECT = "<sentry project slug>"
  RESEND_API_KEY = "<resend api key>"
  WOOVI_API_BASE_URL = "<woovi api base url>"
  WOOVI_API_KEY = "<woovi api key>"
  WOOVI_WEBHOOK_SECRET = "<woovi webhook secret>"
  ASAAS_API_BASE_URL = "<asaas api base url>"
  ASAAS_API_KEY = "<asaas api key>"
  ASAAS_WEBHOOK_TOKEN = "<asaas webhook token>"
}

foreach ($project in $projects) {
  foreach ($entry in $envs.GetEnumerator()) {
    Add-PolarisVercelEnv $project $entry.Key $entry.Value
  }
}
```

## Verification Commands

Run before deploy:

```powershell
bun run typecheck:all
bun run test:all
bun run build:all
bun run check:all
$env:VERCEL_ENV='production'; bun --env-file=.env.production.local scripts/check-production-readiness.ts
```

Run after deploy:

```powershell
bun run prod:preflight
bun run deploy:smoke
bun run deploy:smoke:admin
bun run db:smoke:rls
bun run ops:production-certification:checklist
```

Use these deploy commands after envs are set:

```powershell
npx vercel@latest deploy --prod --project polaris-web-closed --scope summit-studios-projects --logs
npx vercel@latest deploy --prod --project polaris-admin-closed --scope summit-studios-projects --logs
```
