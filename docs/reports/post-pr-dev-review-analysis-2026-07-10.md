# Post-PR Dev Review Analysis - 2026-07-10

## Summary

Verdict: the dev review is mostly correct. The repo is much stronger after the PR stack, but it is not ready for paid public launch yet. The largest gaps are product/commercial activation, production proof against real Vercel/Neon/Inngest state, and a few semantics that should not stay ambiguous.

Do not treat local tests as proof for platform state. Vercel Authentication, Neon RLS on the promoted branch, Inngest cloud schedules, restore drills, R2/Upstash/Sentry alerts, and provider sandbox flows still need live evidence.

## Item-by-item analysis

### 1. Paid flow is not self-service

Status: confirmed gap.

Evidence:
- `apps/web/src/app/billing-required/page.tsx` shows a manual mailto activation handoff.
- The page copy says checkout self-service comes in a later billing cut.
- Webhooks/reconciliation exist, but no customer-facing checkout creation flow exists from `/billing-required`.

Impact: P0 before public paid launch. A new user can be blocked by billing without a way to pay inside the product.

Recommended PR: build a self-service billing activation flow from `/billing-required` for at least one provider/payment method, then add the second provider/method if required.

### 2. Subscription status policy contradicts day-one paid launch

Status: confirmed gap.

Evidence:
- `packages/billing/src/index.ts` grants access for `trialing`, `active`, and `past_due`.
- `packages/billing/src/billing-domain.test.ts` expects `past_due` to be allowed.
- The production plan says billing is required from day one and the PR acceptance text says past-due should block or show a configured restricted state.

Impact: P0/P1. `past_due` is currently unlimited access. `trialing` is enabled even though there is no explicit product decision for trial.

Recommended PR:
- Decide policy: no trial unless intentionally launched.
- Add `grace_period_ends_at` or equivalent if `past_due` gets temporary access.
- Make entitlement evaluation time-aware.
- Update platform billing counts and tests to match the policy.

### 3. Billing RLS is not proven on real Neon promoted branch

Status: confirmed external blocker.

Evidence:
- Plan PR03 states the live smoke was not run because the billing RLS migration was not applied to an approved Neon branch.
- `docs/architecture/rls-tenant-isolation.md` says the updated smoke should report `forcedTables = 18/18`.
- `scripts/smoke-rls-runtime.cjs` contains the runtime smoke and forced table count output.

Impact: P0 launch gate. Local/schema tests are not enough for tenant billing data.

Required evidence:
- Migration applied with `DATABASE_URL_DIRECT` on an approved Neon branch.
- Runtime role without `BYPASSRLS`.
- `bun run db:smoke:rls` reports `forcedTables = 18/18`.
- Cross-tenant billing read/write probes fail for normal app role.
- Platform/admin billing access works only via approved context.

### 4. Outbox capture-only semantics are still problematic

Status: confirmed code gap.

Evidence:
- `packages/events/src/index.ts` inserts all outbox rows as `status = 'pending'`.
- `apps/web/src/lib/inngest-functions.ts` classifies webhook topics as capture-only, but when claimed without dispatcher it calls `markOutboxEventFailed`, which returns status to `pending` unless attempts reach max.
- `packages/db/src/schema.ts` allows only `pending`, `processing`, `processed`, `failed`, `dead_letter`.

Impact: P1. Capture-only rows can look retryable/unfinished and pollute admin operations.

Recommended PR:
- Add an explicit terminal non-dispatch status, preferably `observed`.
- Make capture-only enqueue or processor mark rows as `observed` with `processed_at`.
- Keep retry available only for `failed`/`dead_letter` dispatchable events.

### 5. Inngest schedule is not proven in deploy

Status: confirmed external blocker.

Evidence:
- `apps/web/src/features/products/image-reconcile-inngest.ts` registers `reconcile-product-images` with cron `0 4 * * *`.
- `apps/web/src/app/api/inngest/route.ts` serves the functions.
- Plan PR19 says Inngest cloud sync/schedule was not verified against a deployed app.

Impact: P1 launch gate for operational reliability.

Required evidence:
- Inngest app synced.
- `/api/inngest` reachable in deployed app.
- `reconcile-product-images` visible with cron `0 4 * * *`.
- First execution succeeds.
- Controlled failure retries.
- Manual endpoint works with `PRODUCT_IMAGE_RECONCILE_SECRET`.

### 6. Vercel Authentication remains expected platform state

Status: confirmed external blocker.

Evidence:
- Admin code/docs mention Vercel Authentication, but local code cannot prove dashboard protection.
- `apps/admin/src/lib/deployment-smoke.ts` and `scripts/smoke-admin-deployment.ts` support smoke verification.
- Plan PR05/PR20 explicitly say the real admin smoke was not run.

Impact: P0/P1 before promoting admin.

Required evidence:
- `apps/admin` Vercel project root directory is `apps/admin`.
- Production and previews protected.
- Anonymous deployment URL returns 401/403 when `ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true`.
- Vercel-authenticated user without platform grant is denied by app.
- Vercel-authenticated user with active grant is allowed.
- Google OAuth callbacks work on stable admin domain if admin uses Google auth.

### 7. Restore drill has a guardrail, not a real restore

Status: confirmed external blocker.

Evidence:
- `scripts/check-restore-drill.ts` validates evidence variables only.
- Plan PR21 states it does not perform Neon restore automatically.
- `docs/runbooks/deploy-vercel.md` says the restore drill checklist is an operator gate.

Impact: P0 before risky migrations; P1 before public launch.

Required evidence:
- Restored Neon branch exists.
- Schema/data sanity checks pass on restored branch.
- App login and critical flows run against restored branch.
- RTO/RPO recorded.

### 8. Transactional audit is incomplete across critical domains

Status: partially confirmed gap.

Evidence:
- Platform admin mutations and catalog/settings have transactional audit patterns.
- Product images audit exists via `recordAuditEvent`, but not all product/sales/stock/billing mutations are proven transactional with the business write.
- Plan PR12 notes broader domains retained older behavior.

Impact: P1 for ERP trust. Sales cancellation, stock movements, price changes, and billing status changes are higher priority than settings audit.

Recommended PRs:
- Make sale creation/cancellation audit transactional with stock changes.
- Make stock entry/write-off audit transactional.
- Make price change audit transactional.
- Make billing suspension/reactivation/status changes audit transactional.

### 9. `bun audit` remains red

Status: confirmed.

Evidence:
- `bun audit` exits non-zero with 14 vulnerabilities: 6 high, 6 moderate, 2 low.
- Advisories include `defu`, `vite`, `fast-uri`, `postcss`, `@opentelemetry/core`, `esbuild`, `@babel/core`, and `brace-expansion`.

Impact: P1. Not every advisory is runtime exploitable, but "out of scope" cannot be final launch posture.

Recommended PR:
- Add dependency advisory baseline/risk acceptance document with owner and review date.
- Classify each advisory as runtime/dev-only, direct/transitive, exploitable/non-exploitable in this repo.
- Add CI guard that fails on new advisories beyond baseline.
- Upgrade where a compatible fix exists.

### 10. E2E database connection pressure needs investigation

Status: confirmed signal, not necessarily blocker.

Evidence:
- Prior E2E needed one worker after connection pressure.
- `packages/db/src/index.ts` uses a singleton `pg.Pool`, which is good, but `max: 10` may be high for serverless multiplied by instances/workers.
- Runtime docs require pooled Neon URL; this still needs deploy evidence.

Impact: P1/P2. Not a launch blocker by itself, but should be understood before traffic.

Recommended PR:
- Make pool max configurable with a conservative default for serverless.
- Document pooled Neon URL requirement in preflight.
- Add a lightweight pool config test.
- Revisit E2E concurrency after DB branch/provider limits are known.

### 11. Indexes need real query-plan validation

Status: confirmed external validation gap.

Evidence:
- `apps/web/package.json` exposes `db:analyze:listings`.
- Plan PR16 says the representative Neon dataset analysis was not run.
- `docs/architecture/database-environments.md` documents `PERFORMANCE_ORGANIZATION_ID=... bun run db:analyze:listings`.

Impact: P1/P2. Queries may be fine, but index creation and query plans need real data.

Required evidence:
- `PERFORMANCE_ORGANIZATION_ID=... PERFORMANCE_SEARCH_TERM=... bun run db:analyze:listings` against representative staging/production-like dataset.
- Review of GIN/trigram index creation strategy for current table size.

## Recommended next PR order

1. P0 - Self-service billing activation or explicit controlled-pilot mode.
2. P0/P1 - Subscription entitlement policy: remove unlimited `past_due`, decide `trialing`, add grace-period model if needed.
3. P1 - Outbox `observed` status for capture-only records.
4. P1 - Production Certification runbook/evidence checklist for Vercel Auth, Neon RLS 18/18, Inngest schedule, restore drill, R2/Upstash/Sentry, provider sandbox.
5. P1 - Audit advisory baseline and CI guard.
6. P1 - Transactional audit for sales/stock/price/billing.
7. P1/P2 - DB pool config and E2E concurrency investigation.
8. P1/P2 - Real query-plan validation on representative data.

## No-go criteria for public paid launch

- No self-service checkout/activation or no documented controlled-pilot exception.
- No explicit subscription access policy for `trialing` and `past_due`.
- No live Neon RLS proof with billing tables included.
- No admin Vercel Authentication proof.
- No Inngest schedule proof.
- No restore drill evidence.
- `bun audit` without baseline/risk acceptance.

