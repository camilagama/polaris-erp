# Post-PR Dev Review Analysis - 2026-07-10

## Summary

Verdict: the dev review is mostly correct. The repo is much stronger after the PR stack, but it is not ready for paid public launch yet. The largest gaps are product/commercial activation, production proof against real Vercel/Neon/Inngest state, and a few semantics that should not stay ambiguous.

Do not treat local tests as proof for platform state. Vercel Authentication and admin project configuration, Neon RLS on the promoted branch, Neon branch protection/pooler state, Inngest cloud schedules, restore drills, R2/Upstash/Sentry alerts, provider sandbox flows, and manual billing SOP/SLA signoff still need live evidence. PR 39 makes observability evidence mandatory in the production certification checklist, PR 41 makes manual billing SOP/SLA evidence mandatory there, PR 42 makes Neon branch protection/pooler confirmation mandatory, PR 43 makes admin Vercel project root/source inclusion mandatory, PR 44 makes Asaas/Woovi sandbox timestamps mandatory, PR 45 makes the Inngest reconcile function id mandatory, PR 46 makes restore drill source/restored branches mandatory, and PR 47 makes representative query-plan row/search evidence mandatory; none of those local gates collect the live artifacts by themselves. PR 48 restores one-user onboarding without customer-controlled organization naming, PR 49 adds the DB data repair to normalize existing organization names/slugs to technical values, PR 50 removes organization-name dependency from platform billing/admin billing, PR 51 removes organization-name/slug dependency from the platform admin directory, PR 52 removes the dead customer-name-based organization slug helper, PR 53 removes the stale `organizationName` billing-required test mock, PR 54 reconciles the plan Decision Log with the technical one-user tenant identity decision, PR 55 marks older Cloudflare Access admin reports as superseded by Vercel Authentication guidance, PR 56 adds the formal controlled manual billing activation SOP with default 24-hour SLA, PR 57 adds a source guard so the SOP remains linked to the deploy/certification docs, PR 58 corrects stale PR07 reversal text that still described customer workspace naming as current, PR 59 adds a source guard against tenant-identity documentation drift, PR 60 removes the leftover Vercel Cron config for product-image reconciliation, PR 61 adds an active-source guard against reintroducing Cloudflare Access code/config, PR 62 adds an active-source guard against reintroducing legacy Vercel Cron secrets/config, PR 63 moves goal write audit into the same tenant transaction as the goal mutation, PR 64 adds catalog write actions to the core audit boundary guard, and PR 65 removes stale best-effort audit mocks from product/sale action tests.

## Item-by-item analysis

### 1. Paid flow now has controlled manual activation

Status: controlled-pilot path resolved locally by PR 28 on 2026-07-10, with explicit support/billing contact added by PR 37 on 2026-07-11, payment evidence required for manual activation in PR 40 on 2026-07-11, and production certification requiring manual SOP/SLA evidence in PR 41 on 2026-07-11. Public self-service checkout remains unimplemented.

Evidence:
- `apps/web/src/app/billing-required/page.tsx` now states subscription is required from first access and activation is manual after payment confirmation.
- `SUPPORT_EMAIL` now drives the activation/support mailto on `/billing-required` and account settings; Vercel production env/preflight rejects missing support contact.
- `apps/admin/src/app/billing/actions.ts` adds an operator-only, rate-limited status action for `active`/`past_due`.
- `apps/admin/src/app/billing/actions.ts` now requires `paymentEvidenceReference` before an operator can manually activate access.
- `packages/platform/src/platform-billing.ts` updates billing subscription status transactionally and records `billing.subscription.status_changed` audit events, including payment evidence metadata for manual activation.
- `scripts/check-production-certification.ts` requires `PRODUCTION_CERT_MANUAL_BILLING_SOP_AT` and `PRODUCTION_CERT_MANUAL_BILLING_SLA_HOURS` before production signoff while the app remains on manual activation.
- Webhooks/reconciliation exist, but no customer-facing checkout creation flow exists from `/billing-required`.

Impact: P0 reduced for controlled pilot. A new user remains blocked by billing until an operator activates the subscription after payment confirmation, and the activation now requires an auditable external evidence reference plus a configured contact path. Broad public paid launch still needs self-service checkout or an explicit decision to remain manual.

Recommended PR: build a self-service billing activation flow from `/billing-required` before broad public launch, or keep the product explicitly in controlled manual activation mode with operator SLA, configured `SUPPORT_EMAIL`, and the PR 40 payment evidence requirement.

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
- Read-only Neon plugin check on 2026-07-11 confirmed project `polaris-erp` (`autumn-feather-14038163`) exists with branches `production`, `dev`, and `e2e`; it also showed `production.protected=false` and `pooler_enabled=false` on the listed production compute, so production certification cannot pass until those states are corrected and rechecked.
- Read-only Neon plugin recheck on 2026-07-12 reconfirmed `production` (`br-empty-frog-acrcn1aj`) as primary/default with `protected=false`, production compute `ep-quiet-mode-acv41t95` with `pooler_enabled=false`, and no shared `polaris` project from `list_shared_projects`.

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
- `scripts/check-production-certification.ts` now requires `PRODUCTION_CERT_ADMIN_VERCEL_ROOT_DIRECTORY=apps/admin` and `PRODUCTION_CERT_ADMIN_VERCEL_OUTSIDE_ROOT_INCLUDED=true` before production signoff.

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
- Product image metadata audit now lives in the same tenant transaction as the metadata write after PR 38; R2 object operations remain external side effects.
- Plan PR12 notes broader domains retained older behavior.
- PR 32 changed product update, stock addition, and stock write-off persistence to require `returning({ id })` before price-history/audit writes continue.
- PR 32 tests prove lost product updates reject before audit/revalidation for stock addition, stock write-off, and price update.
- Existing sales and platform billing tests cover lost stock/status updates and transactional platform audit behavior.
- PR 33 added `bun run audit:boundaries`, an AST-based guard that fails CI if core ERP write actions call best-effort `recordAuditEvent` instead of delegating audit to the domain transaction.
- PR 38 moved `product_image.replaced` / `product_image.removed` audit rows into `replaceProductImageMetadata` and `clearProductImageMetadata`, and expanded the boundary guard to cover `replaceProductImageAction` and `removeProductImageAction`.

Impact: P1 reduced. Product stock movements, price changes, and product image metadata changes now have stronger local proof against false audit success. Remaining audit work should focus on any future domains that use best-effort `recordAuditEvent` after committed business writes, plus live DB transaction evidence after migration/deploy.

Recommended follow-up:
- Keep R2 object cleanup as a separate external-side-effect review because object storage delete/upload cannot be rolled back by Postgres.
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
- PR 36 makes the same guard fail when `reviewBy` is invalid or expired, so the temporary acceptance cannot silently age out.
- PR 37 adds `SUPPORT_EMAIL` env/preflight/CI wiring so manual billing activation and data/support requests no longer depend on a placeholder contact.

Impact: P1 reduced. Not every advisory is runtime exploitable, but the baseline is only temporary risk acceptance, not a final public-launch posture.

Recommended follow-up:
- Revisit runtime-sensitive accepted advisories first: `defu`, `fast-uri`, `@opentelemetry/core`.
- Remove resolved advisories from the baseline before or during the 2026-08-10 review; CI now fails after that date if the baseline is not renewed.
- Upgrade where a compatible fix exists.

### 10. E2E database connection pressure now has configurable pool cap

Status: resolved locally by PR 30 on 2026-07-10 for runtime configurability. Deploy behavior still needs observation under real traffic.

Evidence:
- Prior E2E needed one worker after connection pressure.
- `packages/db/src/index.ts` uses a singleton `pg.Pool`, which is good.
- `packages/db/src/pool-config.ts` now defaults `DATABASE_POOL_MAX` to `3` and validates explicit values from `1` to `20`.
- `apps/web/src/ops/production-preflight.ts`, `.env.example`, and `turbo.json` now document/pass `DATABASE_POOL_MAX`.
- Runtime docs require pooled Neon URL; this still needs deploy evidence.
- PR 39 expanded production certification to require R2 health, Upstash rate-limit, Sentry event id, and Sentry alert evidence before signoff.

Impact: P1/P2 reduced. The previous fixed `max: 10` multiplier risk is removed; real concurrency still needs deploy/runtime observation.

Recommended follow-up:
- Revisit E2E/runtime concurrency after DB branch/provider limits are known.
- Confirm production uses pooled Neon `DATABASE_URL` with appropriate `DATABASE_POOL_MAX`.

### 11. Indexes need real query-plan validation

Status: external validation still pending; local certification guard added in PR 34.

Evidence:
- `apps/web/package.json` exposes `db:analyze:listings`.
- Plan PR16 says the representative Neon dataset analysis was not run.
- `docs/architecture/database-environments.md` documents `PERFORMANCE_ORGANIZATION_ID=... bun run db:analyze:listings`.
- PR 34 added `PERFORMANCE_REQUIRE_REPRESENTATIVE=true`, which fails `db:analyze:listings` if any check returns `skipped-small-dataset`.
- PR 34 documents/pass-throughs `PERFORMANCE_*` variables in `.env.example` and `turbo.json`.
- PR 47 makes the production certification checklist require `PRODUCTION_CERT_QUERY_PLAN_MIN_ROWS>=500` and a non-empty `PRODUCTION_CERT_QUERY_PLAN_SEARCH_TERM`, so a timestamp alone cannot certify query-plan readiness.

Impact: P1/P2 reduced but not closed. Queries may be fine, and certification mode now prevents weak small-dataset evidence, but index creation and query plans still need a real representative Neon run.

Required evidence:
- `PERFORMANCE_ORGANIZATION_ID=... PERFORMANCE_SEARCH_TERM=... PERFORMANCE_REQUIRE_REPRESENTATIVE=true bun run db:analyze:listings` against representative staging/production-like dataset.
- Review of GIN/trigram index creation strategy for current table size.

## Recommended next PR order

1. Done locally in PR 28 - Explicit controlled-pilot/manual billing activation mode.
2. Done locally in PR 26 - Subscription entitlement policy: only `active` grants ERP access; no trial/grace by default.
3. Done locally in PR 27 - Outbox `observed` status for capture-only records.
4. PR 35 added production certification evidence checklist; real external evidence for Vercel Auth, Neon RLS 18/18, Inngest schedule, restore drill, R2/Upstash/Sentry, and provider sandbox still must be recorded.
5. Done locally in PR 31 - Audit advisory baseline and CI guard.
6. Done locally in PR 32 for product stock/price write-loss guard; continue watching external-side-effect audit flows.
7. Done locally in PR 30 - DB pool max configurable with conservative serverless default.
8. PR 34 added representative-data certification mode; real Neon query-plan run remains pending.
9. Done locally in PR 37 - Explicit support/billing contact env and UI wiring.
10. Done locally in PR 38 - Product image metadata audit moved into the image metadata transaction.
11. Done locally in PR 39 - Observability evidence required in production certification checklist.
12. Done locally in PR 40 - Manual billing activation requires an auditable payment evidence reference.
13. Done locally in PR 41 - Manual billing SOP/SLA evidence required in production certification checklist.
14. Done locally in PR 42 - Neon production branch protection and pooler-enabled evidence required in production certification checklist.
15. Done locally in PR 43 - Admin Vercel Root Directory and outside-root source evidence required in production certification checklist.
16. Done locally in PR 44 - Asaas and Woovi sandbox evidence required separately in production certification checklist.
17. Done locally in PR 45 - Inngest reconcile function id required in production certification checklist.
18. Done locally in PR 46 - Restore drill source/restored branches required in production certification checklist.
19. Done locally in PR 47 - Representative query-plan min rows and search term required in production certification checklist.
20. Done locally in PR 48 - Customer-controlled organization/workspace naming removed from onboarding, AppContext, app header, and account settings.
21. Done locally in PR 49 - Existing DB organization names/slugs normalized to technical values through a tracked migration.
22. Done locally in PR 50 - Platform billing/admin billing uses organization id and billing email instead of organization name.
23. Done locally in PR 51 - Platform admin directory uses tenant id and redacted primary member email instead of organization name/slug.
24. Done locally in PR 52 - App context no longer exposes a customer-name-to-organization-slug helper.
25. Done locally in PR 53 - Billing-required tests no longer mock the removed `organizationName` context field.
26. Done locally in PR 54 - The plan Decision Log no longer says customer-controlled workspace names are product-facing identity.
27. Done locally in PR 55 - Historical admin docs with Cloudflare Access guidance now carry a supersession note pointing to Vercel Authentication/deployment protection.
28. Done locally in PR 56 - Controlled manual billing activation now has a formal SOP and default 24-hour SLA reference.
29. Done locally in PR 57 - CI workflow source tests now guard that the manual billing SOP remains linked and includes certification variables.
30. Done locally in PR 58 - Stale PR07 reversal text now points to PR48 technical tenant identity as current behavior.
31. Done locally in PR 59 - CI workflow source tests now guard the central plan/report against stale customer-controlled organization/workspace naming language.
32. Done locally in PR 60 - Removed the leftover web Vercel Cron config for product-image reconciliation and added a source guard so scheduling stays on Inngest.
33. Done locally in PR 61 - CI workflow source tests now guard active app/package/script/workflow roots against reintroducing Cloudflare Access code/config.
34. Done locally in PR 62 - CI workflow source tests now guard active app/package/script/workflow roots against reintroducing legacy Vercel Cron secrets/config.
35. Done locally in PR 63 - Goal create/update/archive/unarchive audit now writes inside goal domain transactions, and `audit:boundaries` monitors goal actions.
36. Done locally in PR 64 - Catalog category/settings actions are now monitored by `audit:boundaries`, and catalog action tests no longer mock removed best-effort audit.
37. Done locally in PR 65 - Product/sale action tests no longer mock removed best-effort audit; they assert only action-owned no-revalidation behavior on rejected domain mutations.

## No-go criteria for public paid launch

- No self-service checkout/activation outside the documented controlled-pilot/manual activation exception with operator SLA, `SUPPORT_EMAIL`, payment evidence reference, and production certification variables for SOP/SLA signoff.
- No live Neon RLS proof with billing tables included.
- No Neon production branch protection and pooler-enabled proof.
- No admin Vercel Authentication, Root Directory, and outside-root source inclusion proof.
- No Inngest schedule proof for function id `reconcile-product-images` and cron `0 4 * * *`.
- No restore drill evidence with distinct source and restored validation branches.
- No R2 health, Upstash rate-limit, Sentry event, and Sentry alert evidence in the production certification checklist.
- No separate Asaas and Woovi sandbox evidence in the production certification checklist.
- New `bun audit` advisories beyond the accepted baseline, or expired baseline without owner re-review.
