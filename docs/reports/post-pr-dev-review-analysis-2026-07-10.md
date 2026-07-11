# Post-PR Dev Review Analysis - 2026-07-10

## Summary

Verdict: the dev review is mostly correct. The repo is much stronger after the PR stack, but it is not ready for paid public launch yet. The largest gaps are product/commercial activation, production proof against real Vercel/Neon/Inngest state, and a few semantics that should not stay ambiguous.

Do not treat local tests as proof for platform state. Vercel Authentication, Neon RLS on the promoted branch, Inngest cloud schedules, restore drills, R2/Upstash/Sentry alerts, and provider sandbox flows still need live evidence.

## Item-by-item analysis

### 1. Paid flow now has controlled manual activation

Status: controlled-pilot path resolved locally by PR 28 on 2026-07-10. Public self-service checkout remains unimplemented.

Evidence:
- `apps/web/src/app/billing-required/page.tsx` now states subscription is required from first access and activation is manual after payment confirmation.
- `apps/admin/src/app/billing/actions.ts` adds an operator-only, rate-limited status action for `active`/`past_due`.
- `packages/platform/src/platform-billing.ts` updates billing subscription status transactionally and records `billing.subscription.status_changed` audit events.
- Webhooks/reconciliation exist, but no customer-facing checkout creation flow exists from `/billing-required`.

Impact: P0 reduced for controlled pilot. A new user remains blocked by billing until an operator activates the subscription after payment confirmation. Broad public paid launch still needs self-service checkout or an explicit decision to remain manual.

Recommended PR: build a self-service billing activation flow from `/billing-required` before broad public launch, or keep the product explicitly in controlled manual activation mode with operator SLA and payment evidence process.

### 2. Subscription status policy contradicts day-one paid launch

Status: resolved locally by PR 26 on 2026-07-10.

Evidence:
- `packages/billing/src/index.ts` now grants access only for `active`.
- `packages/billing/src/billing-domain.test.ts` now proves `trialing`, `past_due`, `paused`, `canceled`, and `incomplete` do not grant access.
- `apps/web/src/lib/app-session.test.ts` now proves `trialing` and `past_due` return active organization context but no billable ERP access.
- `packages/platform/src/platform-billing.ts` now counts only `active` subscriptions as active-access subscriptions.

Impact: immediate unlimited `past_due` access removed. Future trial/grace support must be explicit and time-aware.

Follow-up:
- Add `grace_period_ends_at` or equivalent only if `past_due` gets temporary access in a future product decision.
- Keep launch policy as no trial unless intentionally launched.

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

### 4. Outbox capture-only semantics are now explicit

Status: resolved locally by PR 27 on 2026-07-10. Live migration application remains pending.

Evidence:
- `packages/events/src/index.ts` now supports explicit `status: "observed"` enqueue and `markOutboxEventObserved`.
- `apps/web/src/integrations/{asaas,woovi,resend}/webhook.ts` enqueue capture-only webhook records as `observed`.
- `apps/web/src/lib/inngest-functions.ts` marks any claimed legacy capture-only row as `observed` instead of retryable failure.
- `packages/db/src/schema.ts` and migration `20260710233000_event_outbox_observed_status.sql` allow `observed` and migrate old pending capture-only rows.

Impact: P1 closed locally. Admin outbox views can distinguish non-dispatched observation records from retryable work after the migration is applied.

Recommended follow-up:
- Apply the migration on the approved Neon branch and confirm existing capture-only rows no longer appear as `pending`.

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

### 8. Transactional audit coverage is improved for product stock/price

Status: partially mitigated; PR 32 closed the product stock/price write-loss gap locally.

Evidence:
- Platform admin mutations and catalog/settings have transactional audit patterns.
- Product images audit exists via `recordAuditEvent`, but not all product/sales/stock/billing mutations are proven transactional with the business write.
- Plan PR12 notes broader domains retained older behavior.
- PR 32 changed product update, stock addition, and stock write-off persistence to require `returning({ id })` before price-history/audit writes continue.
- PR 32 tests prove lost product updates reject before audit/revalidation for stock addition, stock write-off, and price update.
- Existing sales and platform billing tests cover lost stock/status updates and transactional platform audit behavior.
- PR 33 added `bun run audit:boundaries`, an AST-based guard that fails CI if core ERP write actions call best-effort `recordAuditEvent` instead of delegating audit to the domain transaction.

Impact: P1 reduced. Product stock movements and price changes now have stronger local proof against false audit success. Remaining audit work should focus on any domains still using best-effort `recordAuditEvent` after external side effects, and on live DB transaction evidence after migration/deploy.

Recommended follow-up:
- Keep product image audit as a separate external-side-effect review because object storage delete/upload cannot be rolled back by Postgres.
- Expand `audit:boundaries` if new core ERP write action files are added.
- Re-run representative E2E flows against a real Neon branch after migrations are applied.

### 9. `bun audit` remains red, now guarded by baseline

Status: locally mitigated in PR 31; not fully eliminated.

Evidence:
- `bun audit` exits non-zero with 14 vulnerabilities: 6 high, 6 moderate, 2 low.
- Advisories include `defu`, `vite`, `fast-uri`, `postcss`, `@opentelemetry/core`, `esbuild`, `@babel/core`, and `brace-expansion`.
- `docs/security/dependency-advisory-baseline.json` records the accepted advisories with owner, exposure notes, and review date.
- `bun run audit:baseline` accepts the current 14 advisories and fails on new advisory URLs beyond the baseline.
- `.github/workflows/ci.yml` runs the baseline guard before lint/typecheck/test/build.

Impact: P1 reduced. Not every advisory is runtime exploitable, but the baseline is only temporary risk acceptance, not a final public-launch posture.

Recommended follow-up:
- Revisit runtime-sensitive accepted advisories first: `defu`, `fast-uri`, `@opentelemetry/core`.
- Remove resolved advisories from the baseline during the 2026-08-10 review.
- Upgrade where a compatible fix exists.

### 10. E2E database connection pressure now has configurable pool cap

Status: resolved locally by PR 30 on 2026-07-10 for runtime configurability. Deploy behavior still needs observation under real traffic.

Evidence:
- Prior E2E needed one worker after connection pressure.
- `packages/db/src/index.ts` uses a singleton `pg.Pool`, which is good.
- `packages/db/src/pool-config.ts` now defaults `DATABASE_POOL_MAX` to `3` and validates explicit values from `1` to `20`.
- `apps/web/src/ops/production-preflight.ts`, `.env.example`, and `turbo.json` now document/pass `DATABASE_POOL_MAX`.
- Runtime docs require pooled Neon URL; this still needs deploy evidence.

Impact: P1/P2 reduced. The previous fixed `max: 10` multiplier risk is removed; real concurrency still needs deploy/runtime observation.

Recommended follow-up:
- Revisit E2E/runtime concurrency after DB branch/provider limits are known.
- Confirm production uses pooled Neon `DATABASE_URL` with appropriate `DATABASE_POOL_MAX`.

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

1. Done locally in PR 28 - Explicit controlled-pilot/manual billing activation mode.
2. Done locally in PR 26 - Subscription entitlement policy: only `active` grants ERP access; no trial/grace by default.
3. Done locally in PR 27 - Outbox `observed` status for capture-only records.
4. P1 - Production Certification runbook/evidence checklist for Vercel Auth, Neon RLS 18/18, Inngest schedule, restore drill, R2/Upstash/Sentry, provider sandbox.
5. Done locally in PR 31 - Audit advisory baseline and CI guard.
6. Done locally in PR 32 for product stock/price write-loss guard; continue watching external-side-effect audit flows.
7. Done locally in PR 30 - DB pool max configurable with conservative serverless default.
8. P1/P2 - Real query-plan validation on representative data.

## No-go criteria for public paid launch

- No self-service checkout/activation outside a documented controlled-pilot/manual activation exception.
- No live Neon RLS proof with billing tables included.
- No admin Vercel Authentication proof.
- No Inngest schedule proof.
- No restore drill evidence.
- New `bun audit` advisories beyond the accepted baseline, or expired baseline without owner re-review.
