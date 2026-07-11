# Production Readiness PR Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. This document is a PR execution plan, not an implementation patch. Do not implement without explicit user approval.

**Goal:** Turn Polaris from internal/beta-ready into production-ready SaaS with subscription from day one, hardened tenant data isolation, safer admin deployment, clearer monorepo boundaries, and verified operational gates.

**Architecture:** Keep `apps/web` as the customer product and deploy `apps/admin` as a separate Vercel project rooted at `apps/admin`. Remove Cloudflare Access from admin code and env, enable Vercel Authentication/deployment protection at the platform layer, and keep Better Auth + platform admin grants as the in-app authorization layer. Move recurring internal maintenance from Vercel Cron to Inngest scheduled functions because the project already uses Inngest for durable background execution and image reconciliation benefits from retries/observability.

**Tech Stack:** Next.js 16, React 19, Bun, Turborepo, Drizzle/Postgres/Neon, Better Auth, Vercel, Inngest, R2, Upstash, Sentry, Vitest, Playwright.

## Global Constraints

- Implement only after explicit user approval and keep this plan updated after each PR/reversal.
- Keep PRs small, reviewable, and independently shippable.
- Run narrow tests first, then broader gates.
- Do not run destructive migrations against shared or production databases.
- Use `E2E_DATABASE_URL` isolated for every E2E run.
- Billing is required from day one: no free/beta assumption in production.
- Platform admin must be able to view/manage billing.
- Customers name the workspace during onboarding, while the app remains one-user-per-tenant for the MVP.
- Remove Cloudflare Access from the admin app and replace perimeter protection with Vercel Authentication/deployment protection plus in-app platform admin grants.

---

## Decision Log

1. **Admin deploy:** use a separate Vercel project with root `apps/admin`.
   - Reason: the admin has a different audience, auth perimeter, smoke checks, and operational blast radius.
   - Keep it in the monorepo, but make deployment config app-local and explicit.

2. **Admin protection:** remove Cloudflare Access from code and docs; enable Vercel Authentication/deployment protection for admin deployments.
   - Vercel Authentication protects deployments at the platform layer.
   - Better Auth session + `platform_admins` grants remain mandatory inside the app.
   - Do not rely on platform protection alone for authorization.

3. **Image reconcile schedule:** move from Vercel Cron to Inngest scheduled function.
   - Vercel Cron is simple and supports `CRON_SECRET`, but this job is background maintenance with retry/observability needs.
   - Inngest already exists at `/api/inngest`, and docs support cron schedules via `createFunction(..., { cron })`.
   - Remove `vercel.json` cron after the Inngest scheduled function is verified.

4. **Outbox:** treat it as a real durable event mechanism, not temporary logging.
   - Reason: schema, admin event UI, retry helpers, and Inngest processor already exist.
   - Fix by registering real dispatchers or converting currently unsupported events into explicit synchronous effects plus non-dispatched audit records.

5. **Organization/workspace naming:** keep customer-controlled workspace naming in onboarding.
   - Better Auth organization `name`/`slug` stay as product-facing tenant identity fields.
   - Keep the operating model one-user-per-tenant for the MVP; do not add invitations or workspace switching in this stack.
   - No Neon migration is needed for this reversal because the required columns already exist and remain useful.

---

## Post-Implementation Dev Review Certification

**Status:** Added em 2026-07-10 apos analise do parecer externo.

**Relatorio:** See `docs/reports/post-pr-dev-review-analysis-2026-07-10.md`.

**Conclusao:** The PR stack improved architecture, security boundaries, RLS scaffolding, admin separation, Inngest scheduling, and operational gates, but the project remains **no-go for public paid launch** until the following evidence/fixes exist:

- Self-service billing activation from `/billing-required`, or a formally documented controlled-pilot/manual activation mode. Local controlled manual activation now requires a payment evidence reference in PR 40.
- Explicit subscription policy for `trialing`, `past_due`, `canceled`, and any grace-period window. Local policy implemented in PR 26: only `active` grants ERP access.
- Billing RLS migration applied to an approved Neon branch and live smoke proving `forcedTables = 18/18`.
- Capture-only outbox rows represented by an explicit non-retryable status. Local policy implemented in PR 27 with `observed`; live migration application remains pending.
- Inngest cloud sync/schedule proof for `reconcile-product-images` cron `0 4 * * *`.
- Vercel Authentication/deployment protection proof on the real `apps/admin` Vercel project.
- Real restore/PITR drill evidence, not only checklist variable validation.
- R2 health, Upstash rate-limit, Sentry event, and Sentry alert evidence. Local checklist enforcement added in PR 39; live evidence remains pending.
- Transactional audit guard for product stock/price changes and product image metadata changes is complete locally; R2 object operations remain external side effects with compensating cleanup/reconcile.
- Dependency advisory baseline must be reviewed by 2026-08-10 and now fails CI on new advisory URLs or expired review date.
- Postgres pool/serverless connection review after E2E connection pressure.
- Representative query-plan validation now has a strict local certification mode; live Neon execution remains pending.

**Recommended next PR:** production evidence/certification pass for live Vercel Authentication, Neon RLS, Inngest schedule, restore drill, query-plan execution, provider sandbox, and observability; or continue local hardening while external production access remains unavailable. PR 26 set the entitlement contract, PR 27 resolved capture-only outbox semantics, PR 28 made controlled manual billing activation operable, PR 30 fixed Postgres pool defaults, PR 31 added dependency advisory baseline enforcement, PR 32 closed product stock/price false-audit gaps, PR 33 added a CI guard against best-effort audit in core ERP write actions, PR 34 added strict query-plan certification mode, PR 35 added a production certification evidence checklist, PR 36 made advisory baseline review expiry enforceable, PR 37 made the support/billing contact explicit, PR 38 moved product image metadata audit into the metadata transaction, PR 39 expanded production certification to require observability evidence, and PR 40 made manual billing activation require an auditable payment evidence reference.

### PR 26 - Resolve Subscription Entitlement Policy Review

**Status:** Concluida em 2026-07-10.

**Resultado:** Subscription entitlement now follows the paid-from-day-one policy: only `active` grants operational ERP access. `trialing`, `past_due`, `paused`, `canceled`, and `incomplete` remain canonical statuses but do not grant access until a future trial or grace-period model is explicitly implemented. App context, account billing summary ordering, and platform billing active-access totals now rank/count only `active` as billable access.

**Verificacao executada:**
- `bun --cwd packages/billing test` passed: 3 files, 7 tests.
- `bun --cwd apps/web vitest run src/lib/app-session.test.ts` passed: 1 file, 14 tests.
- `bun --cwd packages/platform test` passed: 7 files, 19 tests.
- `bun run typecheck` passed: 8 workspace tasks successful.
- `bun run check` passed: 439 files checked, no fixes applied.
- `bun run build` passed. It still emitted the existing local Postgres SSL warning for `sslmode=require`; production docs already require `sslmode=verify-full`.
- `bun run test` found two unrelated auth timeout failures in the full concurrent run. Follow-up isolation with `bun --cwd apps/web vitest run src/features/products/actions.test.ts src/features/sales/actions.test.ts --maxWorkers=1` passed: 2 files, 42 tests.

**Decisao de escopo:** No `grace_period_ends_at` column was added in this PR because the product decision is no trial/grace by default for launch. A future grace-period PR must add an explicit timestamp and time-aware entitlement instead of re-allowing `past_due` indefinitely.

**Risco residual:** Provider reconciliation can still normalize late/failed payment states to `past_due`, but those tenants are now blocked from operational app access until status returns to `active`. Customer-facing self-service activation remains a separate P0 gap. The broad test suite showed existing concurrency-sensitive auth timeouts; the affected files passed in isolation with one worker.

**Rollback:** Restore `trialing`/`past_due` in `ACTIVE_ACCESS_STATUSES` and revert the active-access SQL ordering/count changes, only if a documented trial/grace policy exists.

### PR 27 - Resolve Capture-Only Outbox Observed Status Review

**Status:** Concluida em 2026-07-10 para codigo, migracao e verificacoes locais. Aplicacao live da migracao pendente.

**Resultado:** Capture-only webhook topics (`asaas.webhook`, `woovi.webhook`, `resend.webhook`) now enqueue outbox rows as `observed` instead of operational `pending`. The DB schema and forward migration allow the `observed` status and migrate existing pending capture-only rows to `observed` with `processed_at`. If a legacy capture-only row is still claimed by the Inngest processor, it is marked `observed` instead of being returned to retryable pending/failed flow. Retry remains limited to `failed` and `dead_letter`.

**Verificacao executada:**
- `bun --cwd packages/events test` passed: 1 file, 8 tests.
- `bun --cwd apps/web vitest run src/lib/inngest-functions.test.ts src/app/api/webhooks/asaas/route.test.ts src/app/api/webhooks/woovi/route.test.ts src/app/api/webhooks/resend/route.test.ts src/db/event-foundation-schema.test.ts` passed: 5 files, 20 tests.
- `bun run typecheck` passed: 8 workspace tasks successful.
- `bun run check` passed: 439 files checked, no fixes applied.
- `bun run build` passed. It still emitted the existing local Postgres SSL warning for `sslmode=require`; production docs already require `sslmode=verify-full`.

**Decisao de escopo:** This PR did not add durable dispatchers for these webhook topics because their side effects already run synchronously in the handlers. `observed` is intentionally a terminal non-dispatch/audit state, not a substitute for future asynchronous dispatchers.

**Risco residual:** The migration must still be applied to the approved Neon branch before production data benefits from the new check constraint/backfill. Any future capture-only topic must explicitly enqueue `status: "observed"` or register a real dispatcher.

**Rollback:** Revert the schema/migration and handler status changes only before applying the migration. If already applied, use a forward migration that removes `observed` after first moving observed rows to an approved replacement status.

### PR 28 - Resolve Controlled Manual Billing Activation Review

**Status:** Concluida em 2026-07-10 para codigo, admin UI, copy e verificacoes locais.

**Resultado:** Paid-from-day-one now has an explicit controlled-pilot activation path. Onboarding still creates `incomplete` subscriptions, operational access remains blocked until `active`, and the public block page no longer promises a checkout "next cut". Platform operators can activate or block subscriptions from the admin billing page with reason, confirmation, rate limit, transactional status update, and platform audit event `billing.subscription.status_changed`.

**Verificacao executada:**
- `bun --cwd packages/platform test` passed: 7 files, 22 tests.
- `bun --cwd apps/admin vitest run src/app/billing/actions.test.ts` passed: 1 file, 2 tests.
- `bun run typecheck` passed for the web-filtered workspace graph: 8 tasks successful.
- `bun --cwd apps/admin typecheck` passed after fixing the stale admin Playwright import from `../web/src/lib/playwright-env` to `../web/src/ops/playwright-env`.
- `bun run check` passed: 441 files checked, no fixes applied.
- `bun --cwd apps/admin build` passed.
- `bun run build` passed for web. It still emitted the existing local Postgres SSL warning for `sslmode=require`; production docs already require `sslmode=verify-full`.

**Decisao de escopo:** This PR intentionally does not invent self-service checkout, provider customer creation, payment periods, or billing portal URLs because the current codebase has only billing domain status, webhook reconciliation, and admin overview. The MVP path is manual activation after payment confirmation, with audit trail.

**Risco residual:** Broad public paid launch still needs a real self-service checkout/portal or an explicit business decision to operate manually. Manual activation depends on operator process and payment evidence outside this code change.

**Rollback:** Remove the admin billing action/form and revert the block-page copy. Existing subscription statuses remain canonical; if any manual activations happened, reverse them with the same admin action to `past_due` and audit the reason.

### PR 29 - Production Evidence Certification Attempt

**Status:** Nao concluida em 2026-07-10. Bloqueada por acesso/confirmacao externa.

**Resultado parcial:** The Vercel plugin can access team `team_qrwuUvtcEwiZeaFbrvTWhYVk` (`Summit Studio's projects`), but `list_projects` returns an empty project list and `apps/web/.vercel/project.json` project `prj_v2Hd8B75Q0ozFsu8h2fjtXQAgy5i` returns `404 Not Found` through the plugin. There is no `apps/admin/.vercel/project.json`, so live admin Vercel Authentication/protection evidence cannot be collected from this session. The Neon plugin can find project `polaris-erp` (`autumn-feather-14038163`), but applying PR 27 migration or running live RLS/PITR checks against real branches requires explicit operator approval.

**Verificacao executada:**
- Vercel `list_teams` returned team `team_qrwuUvtcEwiZeaFbrvTWhYVk`.
- Vercel `list_projects` for that team returned `[]`.
- Vercel `get_project` for `apps/web/.vercel/project.json` project `prj_v2Hd8B75Q0ozFsu8h2fjtXQAgy5i` returned `404 Not Found`.
- Local file check found `apps/web/.vercel/project.json`, root `.vercel/project.json`, and no `apps/admin/.vercel/project.json`.
- Neon search for `polaris` found project `polaris-erp` (`autumn-feather-14038163`).

**Decisao de escopo:** No production migration, deployment mutation, or live database check was executed without explicit approval. This PR is an evidence-gathering attempt only.

**Risco residual:** Production readiness remains externally unproven for Vercel Authentication/deployment protection, Neon RLS/migration application, Inngest cloud schedule, restore drill, audit baseline, and provider sandbox.

**Para retomar:** Provide or fix Vercel project access/linking for both `apps/web` and `apps/admin`, then approve the exact Neon migration/smoke steps for project `autumn-feather-14038163`.

### PR 30 - Resolve Serverless Postgres Pool Configuration Review

**Status:** Concluida em 2026-07-10 para codigo, docs/env e verificacoes locais.

**Resultado:** Runtime DB pooling now has a conservative serverless default and explicit override. `@polaris/db` resolves `DATABASE_POOL_MAX` through `packages/db/src/pool-config.ts`, defaults to `3`, and rejects invalid values outside `1..20`; the singleton `pg.Pool` uses that value instead of fixed `max: 10`. Production preflight validates the same rule, `.env.example` documents the variable, and `turbo.json` passes it through task environments.

**Verificacao executada:**
- `bun --cwd packages/db test` passed: 1 file, 3 tests.
- `bun --cwd apps/web vitest run src/ops/production-preflight.test.ts src/ops/ci-workflow.test.ts` passed: 2 files, 17 tests.
- `bun run typecheck` passed: 8 workspace tasks successful.
- `bun run check` passed: 443 files checked, no fixes applied.

**Decisao de escopo:** This PR does not change pooling providers, Neon branch limits, or E2E worker count. It removes the hard-coded runtime multiplier and gives production a documented knob with validation.

**Risco residual:** Real Vercel/Neon concurrency still needs deploy observation. Production must continue using a pooled Neon `DATABASE_URL`; this PR only controls per-instance pool size.

**Rollback:** Remove `DATABASE_POOL_MAX` handling and restore the previous `pg.Pool` fixed `max`, only if runtime evidence shows the configured default is too restrictive.

### PR 31 - Add Dependency Advisory Baseline Guard

**Status:** Concluida em 2026-07-11 para baseline, CI guard, testes e docs.

**Resultado:** The current `bun audit --json` output is captured in `docs/security/dependency-advisory-baseline.json` with owner, review date, exposure notes, and temporary acceptance decisions. `bun run audit:baseline` now runs `scripts/check-bun-audit-baseline.ts`, accepts only the known 14 advisory URLs, and fails if any new advisory appears. CI runs this gate before lint/typecheck/test/build, and ops tests cover parsing, deterministic flattening, comparison behavior, package script wiring, and workflow wiring.

**Verificacao executada:**
- `bun run audit:baseline` passed: accepted 14 current advisories.
- `bun --cwd apps/web vitest run src/ops/audit-baseline.test.ts src/ops/ci-workflow.test.ts` passed: 2 files, 14 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 446 files checked, no fixes applied.

**Decisao de escopo:** This PR intentionally does not upgrade or override every transitive dependency because several advisories are pinned behind upstream-compatible releases. The baseline is temporary risk acceptance with a review deadline, not a permanent waiver.

**Risco residual:** `bun audit` itself still exits non-zero for the accepted advisories. Runtime-sensitive items, especially `defu`, `fast-uri`, and `@opentelemetry/core`, must be revisited before broad paid launch or explicitly re-signed by the owner.

**Rollback:** Remove the CI workflow step, root `audit:baseline` script, baseline JSON/MD, and guard script. This restores the previous state where `bun audit` was visible manually but did not prevent new advisories from entering CI.

### PR 32 - Guard Product Stock and Price Audit Against Lost Updates

**Status:** Concluida em 2026-07-11 para produto/estoque/preco, testes e verificacoes locais.

**Resultado:** Product update, stock addition, and stock write-off mutations now require `returning({ id })` from the `products` update before continuing to price history or audit insertion. If the product row is lost between lock and update, the mutation throws `Produto nao encontrado.`, does not write an audit event, and the action does not revalidate cache. Sales cancellation/creation and platform billing were inspected and already had `returning`/transactional audit coverage from prior PRs.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/features/products/actions.test.ts -t "stock addition loses"` failed first with `promise resolved "undefined" instead of rejecting`.
- `bun --cwd apps/web vitest run src/features/products/actions.test.ts` passed: 1 file, 27 tests.
- `bun --cwd apps/web vitest run src/features/products/actions.test.ts src/features/sales/actions.test.ts` passed: 2 files, 45 tests.
- `bun --cwd packages/platform test` passed: 7 files, 22 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 446 files checked, no fixes applied.

**Decisao de escopo:** This PR only fixes core ERP product row writes. Product image audit remains a separate external-side-effect problem because object storage operations cannot be made atomic with the Postgres transaction by `returning`.

**Risco residual:** Real rollback semantics still need live Neon/E2E evidence after migrations are applied. Future domain actions can still reintroduce best-effort audit if they call `recordAuditEvent` outside a transaction for core ERP writes.

**Rollback:** Revert the `returning({ id })` checks in `apps/web/src/features/products/server.ts` and remove the three lost-update regression tests. This restores previous behavior but reopens false audit/revalidation risk when a product update touches zero rows.

### PR 33 - Add Core ERP Audit Boundary Guard

**Status:** Concluida em 2026-07-11 para script, CI, testes e docs.

**Resultado:** `bun run audit:boundaries` now runs `scripts/check-core-audit-boundaries.ts`, which uses the TypeScript AST to inspect monitored core ERP write actions and fail if they call best-effort `recordAuditEvent`. The guard currently covers product create/update/stock/archive actions and sales create/cancel actions, while intentionally allowing product image actions to remain outside the core DB-transaction guard because they coordinate external object-storage side effects. CI runs the guard immediately after the dependency advisory baseline.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/ops/ci-workflow.test.ts -t "release gates|aggregate commands"` failed first because `audit:boundaries` script and CI step were missing.
- `bun run audit:boundaries` passed: `Core ERP audit boundary guard passed.`
- `bun --cwd apps/web vitest run src/ops/audit-boundaries.test.ts src/ops/ci-workflow.test.ts` passed: 2 files, 14 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 448 files checked, no fixes applied.

**Decisao de escopo:** This PR prevents source-level regression for core actions; it does not claim product image audit is transactional with object storage, and it does not replace live database rollback/E2E evidence.

**Risco residual:** New core ERP write files must be added to `CORE_AUDIT_BOUNDARIES`; otherwise the guard cannot inspect them. Live deployment evidence is still required for production certification.

**Rollback:** Remove the CI step, root `audit:boundaries` script, AST guard, and ops tests. This restores previous CI behavior but allows future best-effort audit regressions in core write actions.

### PR 34 - Add Strict Representative Query-Plan Certification Mode

**Status:** Concluida em 2026-07-11 para script, env/docs, testes e verificacoes locais.

**Resultado:** `scripts/analyze-listing-plans.ts` now exports pure helpers for tests, only runs `main()` under `import.meta.main`, and supports `PERFORMANCE_REQUIRE_REPRESENTATIVE=true`. In that mode, `bun run db:analyze:listings` fails if any check returns `skipped-small-dataset`, preventing weak small-tenant evidence from being treated as production performance certification. `.env.example`, `turbo.json`, and database environment docs now document/pass through all `PERFORMANCE_*` variables.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/ops/listing-plan-analysis.test.ts` failed first because importing the script executed `main()` and the desired exports did not exist.
- `bun --cwd apps/web vitest run src/ops/listing-plan-analysis.test.ts` passed: 1 file, 3 tests.
- `bun --cwd apps/web vitest run src/ops/listing-plan-analysis.test.ts src/ops/ci-workflow.test.ts src/ops/postgres-plan.test.ts` passed: 3 files, 16 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 449 files checked, no fixes applied.

**Decisao de escopo:** This PR does not run against Neon because PR 29 remains blocked by external project access/approval. It makes the eventual run stricter and auditable.

**Risco residual:** Query-plan readiness is still externally unproven until the strict command is executed against a representative Neon branch with real `PERFORMANCE_ORGANIZATION_ID` and useful `PERFORMANCE_SEARCH_TERM`.

**Rollback:** Remove `PERFORMANCE_REQUIRE_REPRESENTATIVE`, undo the exported helper refactor/tests, and remove the new env/docs entries. This restores diagnostic-only behavior where small datasets can produce non-failing `skipped-small-dataset` results.

### PR 35 - Add Production Certification Evidence Checklist

**Status:** Concluida em 2026-07-11 para script, job manual, docs, testes e verificacoes locais.

**Resultado:** `bun run ops:production-certification:checklist` now validates explicit operator evidence for the remaining external launch gates: admin Vercel Authentication, Inngest sync and cron `0 4 * * *`, provider sandbox validation, strict query-plan run, restore drill, RLS forced tables `18/18`, and responsible operator. CI exposes this as a manual `production-certification-checklist` workflow job using GitHub variables, and the deploy runbook documents each required evidence variable.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/ops/operations-gates.test.ts` failed first because `scripts/check-production-certification.ts` did not exist.
- `bun --cwd apps/web vitest run src/ops/operations-gates.test.ts src/ops/ci-workflow.test.ts` passed: 2 files, 21 tests.
- `bun run ops:production-certification:checklist` passed with representative placeholder evidence variables.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 450 files checked, no fixes applied.

**Decisao de escopo:** This PR does not fetch live evidence from Vercel, Neon, Inngest, or payment providers. It turns required evidence into a repeatable manual gate so PR 29 can be resumed with concrete variables and a failing CI job when evidence is incomplete.

**Risco residual:** Operators can still enter inaccurate timestamps/values. Real launch readiness still depends on actually running the external checks and preserving their supporting artifacts/logs.

**Rollback:** Remove the root script, CI manual job, `.env.example` entries, runbook section, and tests. This restores the previous runbook-only evidence process.

### PR 36 - Enforce Dependency Advisory Baseline Review Expiry

**Status:** Concluida em 2026-07-11 para script, testes e verificacoes locais.

**Resultado:** `bun run audit:baseline` now validates `dependency-advisory-baseline.json.reviewBy` before accepting known advisories. The guard rejects invalid `reviewBy` values and fails after the review date expires, so the temporary risk acceptance cannot silently persist beyond its owner-reviewed window.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/ops/audit-baseline.test.ts` failed first because `assertBaselineReviewCurrent` did not exist.
- `bun --cwd apps/web vitest run src/ops/audit-baseline.test.ts` passed: 1 file, 6 tests.
- `bun run audit:baseline` passed: accepted 14 current advisories.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 450 files checked, no fixes applied.

**Decisao de escopo:** This PR enforces the review deadline only; it does not update or remove any accepted advisory. The current baseline remains valid until `2026-08-10`.

**Risco residual:** The runtime-sensitive advisories still need upgrade/removal or owner re-approval before/at the review date.

**Rollback:** Remove `assertBaselineReviewCurrent` and its tests. This restores new-advisory detection but allows expired baselines to keep passing.

### PR 37 - Configure Support and Billing Contact

**Status:** Concluida em 2026-07-11 para UI, env, CI/preflight, docs e verificacoes locais.

**Resultado:** The manual paid-from-day-one path no longer renders the placeholder `suporte@polaris.local` or a generic support channel. `SUPPORT_EMAIL` is now part of the web env schema, `.env.example`, Turbo pass-through, production preflight, GitHub manual preflight job, and deployment runbook. `/billing-required` renders the configured support email in the activation mailto, and the account settings panel shows the same contact for support/data requests. Vercel production env validation now rejects a missing support email.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/app/billing-required/page.test.ts src/components/settings/account-settings-panel.test.ts src/lib/env.test.ts src/ops/production-preflight.test.ts src/ops/ci-workflow.test.ts` failed first on the two new UI assertions because the old placeholder/generic support text was still rendered.
- `bun --cwd apps/web vitest run src/app/billing-required/page.test.ts src/components/settings/account-settings-panel.test.ts src/lib/env.test.ts src/ops/production-preflight.test.ts src/ops/ci-workflow.test.ts` passed: 5 files, 28 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 451 files checked, no fixes applied.

**Decisao de escopo:** This PR intentionally does not implement provider self-service checkout, billing portal URLs, or automated payment confirmation. It only makes the controlled-pilot/manual support path publishable and prevents production from deploying without a real contact.

**Risco residual:** Broad paid launch still needs either self-service checkout/portal or an explicit operational decision to keep manual activation. The support address must be configured in Vercel/GitHub Variables before production preflight.

**Rollback:** Remove `SUPPORT_EMAIL` validation/pass-through/docs, restore the previous billing-required link/copy, and remove the two UI tests plus env/preflight wiring assertions. This restores the generic support path and should only be done if another production contact mechanism replaces it.

### PR 38 - Move Product Image Metadata Audit Into Domain Transaction

**Status:** Concluida em 2026-07-11 para metadata de imagem, guard de auditoria, testes e verificacoes locais.

**Resultado:** `replaceProductImageMetadata` and `clearProductImageMetadata` now write the `product_image.replaced` / `product_image.removed` audit event inside the same tenant transaction that updates product image metadata. `replaceProductImageAction` and `removeProductImageAction` no longer call best-effort `recordAuditEvent`; they pass `actorUserId` into the image domain operation instead. The core audit boundary guard now monitors `replaceProductImageAction` and `removeProductImageAction`, so reintroducing best-effort audit in those actions fails CI.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/features/products/image-access.test.ts` failed first because successful metadata updates did not insert audit rows.
- `bun --cwd apps/web vitest run src/ops/audit-boundaries.test.ts` failed first because product image actions were not listed in `CORE_AUDIT_BOUNDARIES`.
- `bun --cwd apps/web vitest run src/features/products/image-access.test.ts src/features/products/actions.test.ts src/ops/audit-boundaries.test.ts` passed: 3 files, 35 tests.
- `bun run audit:boundaries` passed.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 451 files checked, no fixes applied.

**Decisao de escopo:** This PR does not try to make R2 object writes/deletes transactional with Postgres. The invariant hardened here is narrower and real: product image metadata cannot commit without its audit row in the same DB transaction. R2 cleanup remains handled by explicit rollback on failed metadata replace and by image reconciliation for orphaned objects.

**Risco residual:** If R2 deletion fails after a successful metadata/audit transaction, the product state and audit trail remain correct but an orphaned object may remain until reconciliation. Live deploy evidence for the Inngest reconciliation schedule is still part of PR 29.

**Rollback:** Revert the `actorUserId` parameters and transactional `auditEvents` inserts in `image-access`, restore best-effort `recordAuditEvent` calls in image actions, and remove image actions from `CORE_AUDIT_BOUNDARIES`. This reopens the false/no-audit risk for committed image metadata changes.

### PR 39 - Require Observability Evidence in Production Certification

**Status:** Concluida em 2026-07-11 para checklist, CI/env, docs e verificacoes locais.

**Resultado:** The manual production certification checklist now requires live observability evidence in addition to the previous Vercel/Neon/Inngest/provider/restore/query-plan gates. `scripts/check-production-certification.ts` requires ISO timestamps for R2 health, Upstash rate-limit validation, and Sentry alert verification, plus a concrete 32-character Sentry event id. `.env.example`, GitHub workflow variables, CI wiring tests, and deploy runbook now include `PRODUCTION_CERT_R2_HEALTH_AT`, `PRODUCTION_CERT_UPSTASH_RATE_LIMIT_AT`, `PRODUCTION_CERT_SENTRY_EVENT_ID`, and `PRODUCTION_CERT_SENTRY_ALERT_AT`.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/ops/operations-gates.test.ts` failed first because missing observability evidence and an invalid Sentry event id were accepted.
- `bun --cwd apps/web vitest run src/ops/operations-gates.test.ts src/ops/ci-workflow.test.ts` passed: 2 files, 23 tests.
- `bun run ops:production-certification:checklist` passed with representative placeholder evidence variables including R2, Upstash, Sentry event id, and Sentry alert timestamp.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run check` passed: 451 files checked, no fixes applied.

**Decisao de escopo:** This PR does not contact Sentry, Upstash, R2, Vercel, or Neon. It closes the local process gap by making observability evidence mandatory and auditable before production certification can pass.

**Risco residual:** Operators can still enter inaccurate evidence variables. PR 29 remains responsible for collecting and preserving the real supporting artifacts/logs from deployed infrastructure.

**Rollback:** Remove the four new `PRODUCTION_CERT_*` variables from the script, CI workflow, `.env.example`, runbook, and tests. This restores the previous certification checklist but allows production signoff without explicit observability proof.

### PR 40 - Require Payment Evidence for Manual Billing Activation

**Status:** Concluida em 2026-07-11 para admin, platform billing, runbook e verificacoes locais.

**Resultado:** Controlled manual activation now has an enforceable payment evidence step. The admin billing action requires `paymentEvidenceReference` before changing a subscription to `active`, the platform billing service rejects manual activation without that reference, and `billing.subscription.status_changed` platform audit metadata records the reference together with reason/status. Blocking access back to `past_due` still requires reason and confirmation, but not payment evidence. The admin billing form exposes the evidence field only for activation.

**Verificacao executada:**
- `bun --cwd apps/admin vitest run src/app/billing/actions.test.ts` failed first because activation still accepted a blank payment evidence reference and did not pass it to platform billing.
- `bun --cwd packages/platform test` failed first because activation did not require or audit payment evidence.
- `bun --cwd apps/admin vitest run src/app/billing/actions.test.ts` passed: 1 file, 3 tests.
- `bun --cwd packages/platform test` passed: 7 files, 23 tests.
- `bun run typecheck` passed: 8 tasks successful.
- `bun run typecheck:admin` passed: 7 tasks successful.
- `bun run check` passed: 451 files checked, no fixes applied.
- `bun run build:admin` passed.

**Decisao de escopo:** This PR does not implement self-service checkout, provider receipt lookup, invoice creation, or automated payment verification. It makes the approved controlled-pilot/manual path auditable and harder to misuse while the checkout flow remains a future product/payment integration.

**Risco residual:** The payment evidence reference is operator-entered text. It proves that an operator recorded an external artifact id/link/reference, but it does not cryptographically verify the provider payment. Public broad launch still benefits from self-service checkout or a provider-backed activation flow.

**Rollback:** Remove the `paymentEvidenceReference` form field and validation, remove audit metadata for that reference, and revert the new tests/docs. If any activations happened with the field, retain existing audit rows; rolling back code should not mutate historical audit metadata.

---

## P0 Blockers

### PR 01 - Patch Critical Dependency Advisories

**Status:** Concluida em 2026-07-10.

**Resultado:** `next` and `@next/env` upgraded from `16.2.1` to `16.2.9` in the root workspace and internal packages that declare `next` directly. `bun.lock` was regenerated by `bun install`. The Next `<16.2.5` advisory no longer appears in `bun audit`.

**Verificacao executada:**
- `bun run check` passed.
- `bun run check:admin` passed.
- `bun run typecheck` passed.
- `bun run typecheck:admin` passed.
- `bun run test` passed: 110 files, 385 tests.
- `bun run build` passed with Next `16.2.9`.
- `bun run build:admin` passed with Next `16.2.9`.
- `bun audit` ran and still exits non-zero for out-of-scope advisories: `brace-expansion`, `defu`, `postcss`, `vite`, `@babel/core`, `fast-uri`, `@opentelemetry/core`, and `esbuild`.

**Risco residual:** `bun audit` is not globally clean yet; remaining advisories stay assigned to later security/dependency PRs instead of expanding PR 01.

**Objetivo:** Remove known vulnerable dependency ranges before any production work continues.

**Escopo exato:**
- Upgrade `next` from `16.2.1` to a patched version at or above `16.2.5`.
- Update dependent lockfile entries affected by `bun audit`.
- Re-run compatibility checks for Next App Router, Proxy, Cache Components, Sentry, and Inngest.

**Achados endereçados:** `SEC-001`, dependency audit high findings.

**Arquivos prováveis:**
- `package.json`
- `bun.lock`
- `apps/web/next.config.ts`
- `apps/admin/next.config.ts`
- Possibly generated `.next` ignored artifacts only if build runs locally.

**O que não deve ser alterado:**
- No feature changes.
- No auth or DB behavior changes.
- No dependency major upgrades unrelated to advisories unless required by Next.

**Testes necessários:**
- `bun run check`
- `bun run check:admin`
- `bun run typecheck`
- `bun run typecheck:admin`
- `bun run test`
- `bun run build`
- `bun run build:admin`
- `bun audit`

**Critério de aceite:**
- Next advisory for `<16.2.5` no longer appears in `bun audit`.
- Web/admin builds pass.

**Riscos:**
- Next patch may change Cache Components or Proxy behavior.
- Sentry plugin compatibility may need config adjustment.

**Rollback:**
- Revert `package.json` and `bun.lock`.

### PR 02 - Stop Secret Leakage in Webhook Event Capture

**Status:** Concluida em 2026-07-10.

**Resultado:** Added exact `asaas-access-token` redaction to `@polaris/events` and expanded the event foundation test to prove case-insensitive redaction for Asaas, Woovi `x-webhook-signature`, Resend/Svix `svix-signature`, `Authorization`, and `Cookie`. Raw body handling was unchanged.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/lib/event-foundation.test.ts` passed: 1 file, 7 tests.
- `bun run test` passed: 110 files, 385 tests.
- `bun run check` passed.
- `bun run typecheck` passed.

**Risco residual:** Provider-specific headers beyond the current Asaas/Woovi/Resend set would still need explicit addition if introduced later.

**Objetivo:** Ensure webhook secrets are never persisted in `webhook_events.redactedHeaders`.

**Escopo exato:**
- Add `asaas-access-token` to sensitive header redaction.
- Add tests for Asaas, Woovi, Resend/Svix, Authorization, Cookie, and mixed-case header names.
- Keep raw body hashing, not raw body persistence.

**Achados endereçados:** `SEC-002`.

**Arquivos prováveis:**
- `packages/events/src/index.ts`
- `apps/web/src/lib/event-foundation.test.ts`
- Possibly `apps/web/src/lib/asaas-webhook.test.ts`

**O que não deve ser alterado:**
- Do not change provider signature validation.
- Do not change webhook schemas or DB migrations.

**Testes necessários:**
- Targeted Vitest for event foundation.
- `bun run test`

**Critério de aceite:**
- `asaas-access-token` is stored as `[redacted]`.
- Tests prove case-insensitive redaction.

**Riscos:**
- Low. Main risk is missing provider-specific custom headers.

**Rollback:**
- Revert redaction set and tests.

### PR 03 - Make Outbox Semantics Production-Safe

**Status:** Concluida em 2026-07-10.

**Resultado:** Current production webhook topics (`asaas.webhook`, `woovi.webhook`, `resend.webhook`) were classified as capture-only because their side effects are already executed synchronously in the webhook handlers. They still write `event_outbox` rows for visibility/idempotency, but no longer call `sendOutboxEventToInngest` until a real dispatcher is introduced. Missing dispatchers no longer pass `terminal: true`; the processor records an observable error without making the item terminal solely because a dispatcher is absent.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/lib/inngest-functions.test.ts src/lib/asaas-webhook.test.ts src/lib/woovi-webhook.test.ts src/lib/email-service-source.test.ts src/lib/event-foundation.test.ts` passed: 5 files, 22 tests.
- `bun run check` passed.
- `bun run typecheck` passed.
- `bun run test` passed: 110 files, 386 tests.

**Decisao de escopo:** No real dispatcher was registered in this PR because every currently enqueued production webhook topic already performs its side effect synchronously (`reconcileAsaasBillingEvent`, `reconcileWooviBillingEvent`, `recordResendEmailEvent`). Registering dispatchers now would duplicate side effects.

**Risco residual:** Superseded by PR 27. Capture-only topics now use explicit `observed` records locally; production still needs the PR 27 migration applied on Neon.

**Objetivo:** Convert outbox from partially wired durable mechanism into a safe production mechanism.

**Escopo exato:**
- Inventory every `enqueueOutboxEvent` topic/event type.
- Add a source test that fails if enqueued topic/eventType has no dispatcher or explicit non-dispatch policy.
- Register real dispatchers for supported events.
- For events that only need audit/idempotency, do not enqueue to Inngest until a dispatcher exists.
- Make unsupported dispatcher absence non-silent and observable.

**Achados endereçados:** `BACK-001`.

**Arquivos prováveis:**
- `apps/web/src/lib/inngest-functions.ts`
- `apps/web/src/lib/inngest-client.ts`
- `apps/web/src/lib/woovi-webhook.ts`
- `apps/web/src/lib/asaas-webhook.ts`
- `apps/web/src/lib/resend-webhook.ts`
- `packages/events/src/index.ts`
- `apps/web/src/lib/inngest-functions.test.ts`
- `apps/web/src/lib/event-foundation.test.ts`

**O que não deve ser alterado:**
- Do not redesign billing provider adapters in this PR.
- Do not remove admin event visibility.

**Testes necessários:**
- Webhook valid event -> outbox event -> Inngest processor -> processed.
- Unsupported event source test.
- Retry/dead-letter behavior test.
- `bun run test`

**Critério de aceite:**
- No production-enqueued outbox event can become terminal solely because no dispatcher exists.
- Admin event/outbox UI still lists events.

**Riscos:**
- Dispatchers may accidentally duplicate synchronous side effects.

**Rollback:**
- Disable Inngest sending for outbox events while keeping capture records.

---

## P1 Segurança, Autorização e Dados

### PR 04 - Add RLS for Billing with Platform Admin Access Model

**Status:** Concluida em 2026-07-10 para codigo e testes locais. Validacao live pendente.

**Resultado:** Added billing RLS migration for tenant-scoped billing tables, explicit `app.platform_admin_id` context for platform admin billing reads, and `billing_webhook_reconcile` internal context for Asaas/Woovi billing reconciliation. Admin billing now reads through `getPlatformBillingOverviewForAdmin(platformAdminId)`. Billing runtime smoke and RLS architecture docs were expanded.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/db/rls-tenant-isolation.test.ts src/db/tenant-context.test.ts src/lib/platform-billing.test.ts src/lib/asaas-webhook.test.ts src/lib/woovi-webhook.test.ts` passed: 5 files, 20 tests.
- `node --check scripts/smoke-rls-runtime.cjs` passed.
- `bun x ultracite check` passed.
- `bun run check` passed.
- `bun run check:admin` passed.
- `bun run typecheck` passed.
- `bun run typecheck:admin` passed.
- `bun run test` passed: 110 files, 391 tests.
- `bun run build` passed.
- `bun run build:admin` passed.

**Validacao nao executada:** `bun run db:smoke:rls` was not run against a live database because the new billing RLS migration has not been applied to an approved Neon branch/environment in this session. Running the smoke before applying the migration would fail by design; applying the migration to shared infrastructure needs an explicit operational target.

**Risco residual:** Billing RLS must still be applied with `DATABASE_URL_DIRECT` and verified against the promoted runtime role without `BYPASSRLS`; the updated smoke should report `forcedTables = 18/18`.

**Objetivo:** Protect tenant billing tables with RLS while preserving platform admin billing access.

**Escopo exato:**
- Enable and force RLS on billing tenant tables.
- Add policies using `app.organization_id` for customer runtime access.
- Add explicit platform/admin access policy or separate DB role/session context for platform admin workflows.
- Expand RLS smoke and source tests to billing.

**Achados endereçados:** `DB-001`.

**Arquivos prováveis:**
- `packages/db/src/schema.ts`
- `packages/db/src/migrations/*.sql`
- `apps/web/src/db/rls-tenant-isolation.test.ts`
- `scripts/smoke-rls-runtime.cjs`
- `docs/architecture/rls-tenant-isolation.md`
- `docs/architecture/database-environments.md`

**O que não deve ser alterado:**
- Do not change billing product behavior yet.
- Do not make platform admin a tenant member.

**Testes necessários:**
- Source test for `ENABLE/FORCE ROW LEVEL SECURITY`.
- Runtime smoke: tenant A cannot read tenant B billing.
- Platform admin path can read billing through approved context.

**Critério de aceite:**
- Billing tables are covered by RLS and tested.
- Platform admin billing access is explicit and documented.

**Riscos:**
- Incorrect policy could block admin billing pages.

**Rollback:**
- Revert migration before production deploy; if deployed, create forward migration restoring previous policies only after approval.

### PR 05 - Remove Cloudflare Access from Admin and Use Vercel Authentication

**Status:** Concluida em 2026-07-10 para codigo, docs e testes locais.

**Resultado:** Removed the Cloudflare Access runtime module/export, app envs, CI/preflight env wiring, admin copy, and current deploy runbook requirements. Admin authorization now depends on Better Auth session plus active `platform_admins` grant only, while the runbook requires Vercel Authentication/deployment protection on the separate `apps/admin` Vercel project. `jose` was removed from `@polaris/platform-auth` dependencies because it was only used by the Cloudflare Access verifier.

**Verificacao executada:**
- Active code/config search passed with no `Cloudflare Access`, `cloudflare-access`, `CLOUDFLARE_ACCESS`, `cf-access`, `verifyCloudflareAccess`, or `requireAccess` references in `apps`, `packages`, `scripts`, `.github`, `.env.example`, `turbo.json`, and current deploy runbook.
- `bun --cwd apps/web vitest run src/lib/platform-admin-auth.test.ts src/lib/admin-app-protection.test.ts src/lib/production-preflight.test.ts src/lib/env.test.ts src/lib/ci-workflow.test.ts` passed: 5 files, 32 tests.
- `bun x ultracite check` passed.
- `bun run check` passed.
- `bun run check:admin` passed.
- `bun run typecheck` passed.
- `bun run typecheck:admin` passed.
- `bun run test` passed: 109 files, 387 tests.
- `bun run build` passed.
- `bun run build:admin` passed.
- `bun run test:e2e:admin` passed: 2 Playwright tests.

**Risco residual:** Vercel Authentication/deployment protection is platform state and cannot be proven by local tests. Before promoting admin, the operator must verify the admin Vercel project has SSO/deployment protection enabled for production deployment URLs and previews.

**Objetivo:** Replace Cloudflare Access code-level dependency with Vercel Authentication/deployment protection plus in-app platform admin authorization.

**Escopo exato:**
- Remove `@polaris/platform-auth/cloudflare-access` usage.
- Remove `CLOUDFLARE_ACCESS_AUD` and `CLOUDFLARE_ACCESS_TEAM_DOMAIN` from app env validation, docs, CI preflight, and runbooks.
- Keep `requirePlatformAdmin` based on Better Auth session + `platform_admins` grants.
- Update admin copy that mentions Cloudflare Access.
- Add docs/runbook steps to enable Vercel Authentication/deployment protection for the admin Vercel project.

**Achados endereçados:** `SEC-004`, user request to remove Cloudflare Access.

**Arquivos prováveis:**
- `packages/platform-auth/src/admin-guard.ts`
- `packages/platform-auth/src/cloudflare-access.ts`
- `packages/platform-auth/package.json`
- `apps/admin/src/lib/platform-admin-auth.ts`
- `apps/admin/src/app/forbidden.tsx`
- `apps/admin/src/app/page.tsx`
- `apps/web/src/lib/production-preflight.ts`
- `.env.example`
- `turbo.json`
- `docs/runbooks/deploy-vercel.md`
- `README.md`

**O que não deve ser alterado:**
- Do not weaken platform admin grants.
- Do not expose admin on the same origin as web.

**Testes necessários:**
- Admin auth unit tests for no session, no grant, insufficient role, valid grant.
- `bun run typecheck:admin`
- `bun run build:admin`
- `bun run test:e2e:admin` with isolated DB.

**Critério de aceite:**
- No Cloudflare Access envs or runtime imports remain.
- Admin still requires Better Auth session and active platform grant.
- Runbook tells operator to enable Vercel Authentication for admin deployments.

**Riscos:**
- Vercel Authentication is platform config, so local tests cannot prove dashboard state.

**Rollback:**
- Revert code/docs and restore Cloudflare envs.

### PR 06 - Require Subscription from Day One

**Status:** Concluida em 2026-07-10 para codigo, migracao e testes locais.

**Resultado:** Added the initial active production billing plan seed migration (`polaris-start-monthly`), made onboarding create billing customer/subscription records, and made operational app access require billable subscription status. New tenants created through the normal onboarding path start with `incomplete` billing and are redirected to `/billing-required` until activation; isolated local Playwright bootstrap can create an active subscription only when `DATABASE_URL === E2E_DATABASE_URL`, `ALLOW_PLAYWRIGHT_BOOTSTRAP=true`, and the request is loopback. The app shell now forces dynamic session/billing evaluation before rendering protected pages.

**Nota supersedida por PR 26:** The original PR 06 allowed `trialing`, `active`, or `past_due`; PR 26 tightened this to `active` only.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/lib/feature-boundary.test.ts src/app/api/auth/dev/bootstrap-session/route.test.ts` passed: 2 files, 15 tests.
- `bun run test` passed: 109 files, 394 tests.
- `bun run typecheck` passed.
- `bun run build` passed; `/billing-required` is included in the production route manifest.
- `bun run test:e2e` passed: 9 tests using 1 worker.
- `bun x ultracite check` passed.

**Decisao de escopo:** The billing block is production-enforced, but the customer-facing activation is a minimal handoff page instead of full self-service checkout/plan management. This keeps the PR inside the agreed "minimum production gate" scope and leaves full billing UX for a later billing/provider PR.

**Risco residual:** The new billing plan seed migration still needs to be applied to an approved database branch/environment before production promotion. E2E web now runs with `workers: 1` because the billing gate adds authenticated DB reads and the previous 6-worker run exhausted/terminated local E2E database connections.

**Objetivo:** Make billing a production gate, not a future/internal-only module.

**Escopo exato:**
- Define initial production plan(s).
- During onboarding/first-login flow, create or require a billing customer/subscription state.
- Block app access when organization has no active subscription.
- Add user-facing billing state page or checkout handoff.
- Keep platform admin able to inspect and manage billing.

**Achados endereçados:** product billing gap, `DB-001`, user decision: subscription from day one.

**Arquivos prováveis:**
- `packages/db/src/schema.ts`
- `packages/billing/src/**`
- `packages/platform/src/platform-billing.ts`
- `apps/web/src/lib/app-session.ts`
- `apps/web/src/features/onboarding/actions.ts`
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/app/(app)/configuracoes/page.tsx`
- `apps/admin/src/app/billing/page.tsx`
- `docs/product/01-regras-de-negocio.md`
- `docs/product/roadmap.md`

**O que não deve ser alterado:**
- Do not build full self-serve plan management beyond minimum production gate.
- Do not introduce a second auth system.

**Testes necessários:**
- New user without subscription cannot enter operational app.
- Active subscription allows access.
- Past due/canceled blocks or shows configured restricted state.
- Platform admin can view subscription/invoice records.

**Critério de aceite:**
- Production path cannot create active tenant usage without subscription state.
- Billing status is visible and test-covered.

**Riscos:**
- Premature billing gate may block E2E/dev unless test bootstrap creates valid billing state.

**Rollback:**
- Feature flag billing gate off for non-production only; production rollback requires explicit release decision.

### PR 07 - Remove Customer-Controlled Organization Naming

**Status:** Revertida funcionalmente em 2026-07-10 por decisao de produto. A workspace voltou a ser nomeada no onboarding.

**Resultado anterior:** Removed the customer-controlled organization name field from onboarding, changed onboarding into a one-button account activation flow, stopped exposing `organizationName` through `AppContext`, and removed the organization name from the authenticated app header. Tenant creation generated hidden Better Auth-compatible technical values (`Tenant <id>` / `tenant-<id>`) server-side.

**Resultado da reversao:** Onboarding now asks for `workspaceName` again, validates it as required, and passes it into tenant creation. `createInitialOrganizationForUser` stores the chosen name in Better Auth `organization.name`, derives a slug from the workspace name, and appends the generated tenant id prefix if the base slug already exists. `AppContext` exposes `organizationName` again, the authenticated app header displays the workspace name, and the account/settings surface shows the workspace alongside the user/billing details.

**Verificacao executada:**
- Context7 Better Auth docs confirmed the organization plugin still requires `name` and `slug` in create/schema, so the DB columns were not dropped in this PR.
- `bun --cwd apps/web vitest run src/features/onboarding/actions.test.ts "src/app/(auth)/onboarding/onboarding-form.test.ts" src/lib/app-session.test.ts "src/app/(app)/configuracoes/page.test.ts" src/components/settings/account-settings-panel.test.ts` passed: 5 files, 17 tests.
- `bun --cwd apps/web vitest run src/lib/app-session.test.ts` passed: 1 file, 12 tests.
- `bun run test` passed: 105 web test files, 396 web tests, plus package dependency tests.
- `bun run typecheck` passed.
- `bun run check` passed after `bun x ultracite fix` formatted `apps/web/src/lib/app-session.test.ts`.
- `bun run build` passed.
- Final source search found no active technical tenant name generation (`Tenant <id>` / `tenant-<id>`) in app code; remaining `tenant` references are isolation/context terminology.

**Decisao de escopo anterior:** Better Auth still models organizations with required `name` and unique `slug`, so the original PR07 removed customer naming and product reliance on the name, but kept DB fields populated with non-customer technical values. That product decision has been superseded by the current reversal.

**Decisao atual:** Organization/workspace naming is product-relevant now and likely important for future multi-workspace or admin workflows. The DB columns are already required by Better Auth and remain the source of truth; no Neon migration is needed for this reversal.

**Risco residual:** Slug collision handling is intentionally conservative: it preserves the requested display name and suffixes only the slug when the base slug is already taken. Existing tenants created while PR07 was active may still have technical names until renamed by a future workspace settings flow or data repair.

**Objetivo atualizado:** Restore organization/workspace naming in onboarding, UI, and app context while preserving the one-user-per-tenant operating model.

**Escopo exato atualizado:**
- Reintroduce workspace name input in onboarding.
- Create tenant/workspace with the chosen display name.
- Derive Better Auth organization slug from workspace name and handle slug collisions conservatively.
- Restore `organizationName` in app context and authenticated UI.
- Keep Better Auth `organization.name`/`slug` columns as product-facing fields.
- Do not add multi-user invitations or workspace switching in this reversal.

**Achados endereçados:** user request, onboarding simplification, product readiness.

**Arquivos prováveis:**
- `apps/web/src/app/(auth)/onboarding/page.tsx`
- `apps/web/src/app/(auth)/onboarding/onboarding-form.tsx`
- `apps/web/src/features/onboarding/actions.ts`
- `apps/web/src/lib/app-session.ts`
- `apps/web/src/lib/app-context.ts`
- `packages/db/src/schema.ts`
- `packages/db/src/migrations/*.sql`
- `README.md`
- `docs/runbooks/deploy-vercel.md`

**O que não deve ser alterado:**
- Do not remove tenant isolation.
- Do not remove `organization_id` from domain tables.
- Do not remove Better Auth session organization linkage unless replaced safely.

**Testes necessários atualizados:**
- New user must enter workspace name during onboarding.
- Tenant is created with owner membership, default category, settings, audit event.
- App context exposes organization name and app shell displays it.
- DB migration is not required because Better Auth organization fields already exist.

**Critério de aceite atualizado:**
- Customer can name workspace during onboarding.
- Existing tenants migrate safely.
- Tenant isolation still works.

**Riscos:**
- Better Auth organization plugin may require `name`/`slug`.

**Rollback:**
- Reintroduce hidden generated name/slug fields without restoring UI input.

---

## P1/P2 Bugs Funcionais

### PR 08 - Fix Admin Organization Status Mutation Integrity

**Status:** Concluida em 2026-07-10.

**Resultado:** `updatePlatformOrganizationStatus` now uses Drizzle `returning({ id })` after the status update and throws `Organization not found for status change.` when no organization row is updated. Platform audit insertion only runs after the update is confirmed.

**Verificacao executada:**
- Context7 Drizzle docs confirmed PostgreSQL `update().set().where().returning({ id })` syntax.
- `bun --cwd apps/web vitest run src/lib/platform-organization-mutations.test.ts` passed: 1 file, 4 tests.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun run test` passed: 109 files, 394 tests.

**Risco residual:** Existing admin callers must surface the thrown missing-organization error cleanly; this PR preserves current caller behavior except for preventing false audit success.

**Objetivo:** Prevent false audit success when no organization row changes.

**Escopo exato:**
- Add `.returning()` to status mutation.
- Throw when update touches zero rows.
- Audit only after confirmed update.

**Achados endereçados:** `BACK-002`.

**Arquivos prováveis:**
- `packages/platform/src/platform-organization-mutations.ts`
- `apps/web/src/lib/platform-organization-mutations.test.ts`

**O que não deve ser alterado:**
- No admin UI redesign.

**Testes necessários:**
- Missing organization rejects.
- No audit insert on missing organization.
- Valid update still audits.

**Critério de aceite:**
- Audit cannot claim status changed when DB did not change.

**Riscos:**
- Existing callers may need to surface the thrown error.

**Rollback:**
- Revert mutation change.

### PR 09 - Make Catalog Audit Transactional

**Status:** Concluida em 2026-07-10.

**Resultado:** Catalog mutations now write their audit events inside the same `withTenantContext` transaction as the category/settings mutation. Catalog actions pass `context.userId` into the server mutators and only revalidate cache after the transactional mutator succeeds. `recordAuditEvent` remains best-effort for unrelated domains; it is no longer used by catalog mutations.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/features/catalog/actions.test.ts src/features/catalog/server.test.ts` passed: 2 files, 11 tests.
- `bun x ultracite check` passed.
- `bun run test` passed: 109 files, 395 tests.
- `bun run typecheck` passed.
- `bun run build` passed.

**Risco residual:** This PR intentionally scoped transactional audit to catalog/category/settings mutations only. Product, sales, goals, and image audit flows still use their previous audit behavior and should be addressed separately if the same transactional guarantee is required there.

**Objetivo:** Ensure catalog changes and audit records commit or rollback together.

**Escopo exato:**
- Move category/settings mutations and audit insert into one transaction.
- Use tenant context inside the same transaction.

**Achados endereçados:** `DB-004`.

**Arquivos prováveis:**
- `apps/web/src/features/catalog/actions.ts`
- `apps/web/src/features/catalog/server.ts`
- `apps/web/src/lib/audit-log.ts`
- `apps/web/src/features/catalog/actions.test.ts`

**O que não deve ser alterado:**
- No settings UI behavior changes.

**Testes necessários:**
- Simulated audit failure rolls back mutation, or outbox fallback is created transactionally.

**Critério de aceite:**
- No catalog mutation can persist without audit or declared durable fallback.

**Riscos:**
- Existing helper `writeAuditEvent` may not accept an external transaction.

**Rollback:**
- Revert to prior mutation path.

### PR 10 - Validate Platform Support Note Targets

**Status:** Concluida em 2026-07-10.

**Resultado:** Support notes now validate `customerUserId + organizationId` against the Better Auth `member` table before inserting the note/audit event. Listing support notes with both filters now uses `organization_id = ... and customer_user_id = ...` instead of `or`, preventing unrelated notes from leaking into combined target views.

**Verificacao executada:**
- `bun --cwd apps/web vitest run src/lib/platform-support-notes.test.ts` passed: 1 file, 5 tests.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun run test` passed: 109 files, 397 tests.

**Risco residual:** Historical inconsistent notes, if any, are not cleaned up by this PR. This change prevents new inconsistent notes and fixes combined-filter reads going forward.

**Objetivo:** Prevent notes linking unrelated user and organization.

**Escopo exato:**
- If both `organizationId` and `customerUserId` exist, validate membership relation.
- Fix list query semantics when both filters are supplied.

**Achados endereçados:** `DB-003`.

**Arquivos prováveis:**
- `packages/platform/src/platform-support-notes.ts`
- `apps/web/src/lib/platform-support-notes.test.ts`

**O que não deve ser alterado:**
- Do not redesign support notes UI.

**Testes necessários:**
- User outside organization is rejected.
- Query with both filters does not return unrelated notes.

**Critério de aceite:**
- Support note target is semantically consistent.

**Riscos:**
- Historical inconsistent notes may exist and need a cleanup report.

**Rollback:**
- Revert validation while preserving tests as skipped only with explicit approval.

---

## Testes Para Fluxos Críticos

### PR 11 - Add Package-Level Test Suites

**Status:** Concluido em 2026-07-10.

**Resultado:** Added package-owned `test` scripts, moved package contract tests from `apps/web/src/lib` into their owning packages, added root `test:all`, and kept production logic unchanged.

**Verificacao:**
- `bun --cwd packages/auth test` passed.
- `bun --cwd packages/billing test` passed.
- `bun --cwd packages/events test` passed.
- `bun --cwd packages/platform test` passed.
- `bun --cwd packages/platform-auth test` passed.
- `bun run test:all` passed.
- `bun run test` passed.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.

**Objetivo:** Give extracted packages their own behavioral tests.

**Escopo exato:**
- Add `test` scripts for `@polaris/auth`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth` or their replacements after Cloudflare removal.
- Move package-owned tests out of `apps/web/src/lib` where appropriate.
- Add root `test:all`.

**Achados endereçados:** `TEST-001`, monorepo organization.

**Arquivos prováveis:**
- `packages/*/package.json`
- `packages/*/src/**/*.test.ts`
- `apps/web/src/lib/*platform*.test.ts`
- `turbo.json`
- `package.json`

**O que não deve ser alterado:**
- No production logic changes except import path updates needed for moved tests.

**Testes necessários:**
- `bun run test:all`
- Existing `bun run test`

**Critério de aceite:**
- Shared packages fail independently when their contracts break.

**Riscos:**
- Moving tests may require test aliases/config.

**Rollback:**
- Restore tests to web app and remove package scripts.

### PR 12 - Add Direct Webhook Behavior Tests

**Status:** Concluido em 2026-07-10.

**Resultado:** Added direct route behavior tests for Asaas, Woovi, and Resend webhooks, covering missing credentials/headers, invalid signatures or payloads, duplicate-safe idempotency keys, successful capture/outbox paths, and oversized payload rejection. Added a shared webhook request size guard returning `413`.

**Verificacao:**
- `bun --cwd apps/web vitest run src/app/api/webhooks/asaas/route.test.ts src/app/api/webhooks/woovi/route.test.ts src/app/api/webhooks/resend/route.test.ts src/lib/asaas-webhook.test.ts src/lib/woovi-webhook.test.ts` passed.
- `bun run test` passed.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.

**Objetivo:** Cover public webhook edges directly.

**Escopo exato:**
- Add behavior tests for Resend webhook.
- Expand Asaas/Woovi tests for missing headers, invalid signature/token, oversized body, duplicate event, successful capture/outbox.

**Achados endereçados:** `TEST-002`, `SEC-003`, `BACK-001`.

**Arquivos prováveis:**
- `apps/web/src/lib/resend-webhook.test.ts`
- `apps/web/src/lib/asaas-webhook.test.ts`
- `apps/web/src/lib/woovi-webhook.test.ts`
- `apps/web/src/app/api/webhooks/*/route.test.ts`

**O que não deve ser alterado:**
- No provider adapter redesign.

**Testes necessários:**
- Targeted webhook tests.
- `bun run test`

**Critério de aceite:**
- Every public webhook route has direct negative and positive tests.

**Riscos:**
- Provider signature mocks can become too implementation-specific.

**Rollback:**
- Remove new tests only if they are proven incorrect.

### PR 13 - Add Admin Unit Tests and E2E Isolation

**Status:** Concluido em 2026-07-10.

**Resultado:** Added admin Vitest setup, root `test:admin`, CI admin unit-test step, and fast bootstrap guard tests for forbidden environment, missing secret, invalid authorization, and invalid payload. Updated admin E2E CI to use `ADMIN_E2E_DATABASE_URL` through `E2E_DATABASE_URL`, avoiding parallel reuse of the web E2E database.

**Verificacao:**
- `bun run test:admin` passed.
- `bun run test:all` passed.
- `bun run typecheck:admin` passed.
- `bun x ultracite check` passed.
- `bun run test:e2e:admin` not run locally because it requires a real isolated admin E2E database secret; CI must provide `ADMIN_E2E_DATABASE_URL`.

**Objetivo:** Make admin regressions visible before Playwright.

**Escopo exato:**
- Add admin unit/source test setup.
- Cover bootstrap admin negative paths.
- Split CI E2E DBs for web/admin or serialize jobs.

**Achados endereçados:** `TEST-003`, `DEVOPS-006`.

**Arquivos prováveis:**
- `apps/admin/package.json`
- `apps/admin/vitest.config.ts`
- `apps/admin/src/**/*.test.ts`
- `.github/workflows/ci.yml`
- `scripts/check-e2e-db-schema.ts`

**O que não deve ser alterado:**
- No admin feature changes.

**Testes necessários:**
- `bun run test:admin`
- `bun run test:e2e:admin` with isolated DB.

**Critério de aceite:**
- Admin has fast tests for auth/bootstrap guardrails.
- Web/admin E2E no longer share a DB in parallel.

**Riscos:**
- More CI time.

**Rollback:**
- Keep unit tests but temporarily serialize E2E if DB split is not ready.

---

## UX Crítica

### PR 14 - Confirm Destructive Product Actions

**Status:** Concluido em 2026-07-10.

**Resultado:** Added explicit archive confirmation, converted stock write-off into a review/confirm flow, added client-side `NaN`/empty/`<=0`/`> stock` validation with inline feedback, and updated the operations E2E scenario for cancel/confirm archive plus blocked over-stock write-off.

**Verificacao:**
- `bun --cwd apps/web vitest run src/components/products/product-detail-actions.test.ts src/components/products/products-panel.test.ts src/features/products/actions.test.ts` passed.
- `bun --cwd apps/web vitest run src/features/sales/actions.test.ts src/features/sales/server.test.ts` passed after first full-suite timeout indicated contention in unrelated sales tests.
- `bun run test` passed on rerun.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun run test:e2e` not run locally because it requires the isolated E2E database; `apps/web/tests/e2e/operations.e2e.ts` was updated for the new confirmation flow.

**Objetivo:** Prevent accidental stock write-offs and product archiving.

**Escopo exato:**
- Add confirmation for stock write-off and archive.
- Validate `NaN`, `<=0`, and `> stock` client-side before submit.
- Show inline errors.

**Achados endereçados:** `UX-001`, `UX-002`.

**Arquivos prováveis:**
- `apps/web/src/components/products/product-detail-actions.tsx`
- `apps/web/tests/e2e/operations.e2e.ts`
- Component tests if existing setup supports it.

**O que não deve ser alterado:**
- No inventory domain rule changes.

**Testes necessários:**
- E2E cancel/confirm archive.
- E2E write-off above stock blocked.
- Unit/component test for disabled states.

**Critério de aceite:**
- Destructive actions require explicit confirmation.

**Riscos:**
- Extra clicks in operations flow.

**Rollback:**
- Revert UI confirmation only; keep server-side validation.

### PR 15 - Fix Admin Accessibility and Mobile Layout

**Status:** Concluido em 2026-07-10.

**Resultado:** Added accessible names for admin search/filter inputs and support-note textareas, changed the disabled dashboard summary card from a fake link into a non-interactive `article`, and added horizontal overflow/min-width wrappers to fixed admin grids for mobile safety.

**Verificacao:**
- `bun run test:admin` passed.
- `bun run typecheck:admin` passed.
- `bun x ultracite check` passed.
- Playwright `getByLabel`/mobile viewport checks were not run locally because admin E2E requires the isolated admin E2E database; source-level admin accessibility tests now cover the labels, non-link disabled card, and responsive wrappers.

**Objetivo:** Make admin filters/forms navigable and reduce mobile layout breakage.

**Escopo exato:**
- Add labels or `aria-label` for admin inputs/textareas.
- Render disabled admin dashboard card as non-link.
- Add mobile-safe table/list wrappers.

**Achados endereçados:** `UX-003`, `UX-004`, `UX-005`.

**Arquivos prováveis:**
- `apps/admin/src/app/page.tsx`
- `apps/admin/src/app/organizations/page.tsx`
- `apps/admin/src/app/audit/page.tsx`
- `apps/admin/src/app/organizations/[organizationId]/page.tsx`
- `apps/admin/src/app/users/[userId]/page.tsx`
- `apps/admin/tests/e2e/admin-access.e2e.ts`

**O que não deve ser alterado:**
- No admin data model changes.

**Testes necessários:**
- Playwright `getByLabel`.
- Mobile viewport no horizontal overflow for key pages.

**Critério de aceite:**
- Inputs have accessible names.
- Disabled card is not a misleading link.

**Riscos:**
- Minor visual regressions.

**Rollback:**
- Revert layout wrappers/labels.

---

## Performance

### PR 16 - Move Dashboard/List Aggregations to SQL

**Status:** Concluido em 2026-07-10.

**Resultado:** Moved the critical dashboard metrics path from raw sales/item hydration plus JavaScript aggregation to SQL aggregates for period sales, period product costs, and top products. Kept the dashboard contract stable by adding `buildDashboardMetricsFromAggregates`, while preserving the old raw-row builder for isolated domain tests and compatibility.

**Verificacao:**
- `bun --cwd apps/web vitest run src/features/dashboard/metrics.test.ts src/features/dashboard/server.test.ts` passed.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun run test` passed.

**Decisao de escopo:** This PR intentionally limited the performance fix to the dashboard metrics route, the clearest critical aggregate. Contribution graph and list/search/index work remain assigned to later performance PRs so this change stays reviewable.

**Risco residual:** SQL bucket behavior is covered by contract tests, but query plan/performance should still be validated against representative Neon data before production promotion.

**Objetivo:** Reduce memory/CPU and improve TTFB for growing tenants.

**Escopo exato:**
- Replace JS aggregation of raw rows with SQL aggregation.
- Keep result contracts stable.
- Add representative tests for totals/top products/date buckets.

**Achados endereçados:** `PERF-001`.

**Arquivos prováveis:**
- `apps/web/src/features/dashboard/server.ts`
- `apps/web/src/features/dashboard/metrics.ts`
- `apps/web/src/features/sales/server.ts`
- `apps/web/src/features/products/server.ts`
- Related tests.

**O que não deve ser alterado:**
- No UI redesign.

**Testes necessários:**
- Existing dashboard/sales/products tests.
- New SQL contract tests.

**Critério de aceite:**
- Critical aggregates no longer require loading all rows.

**Riscos:**
- SQL/date bucket behavior may differ from JS.

**Rollback:**
- Revert to previous aggregation implementation.

### PR 17 - Add Search Index Strategy

**Status:** Concluido em 2026-07-10.

**Resultado:** Added `pg_trgm` search strategy for listing text searches: category names, active/archived product names, and sale customer names now have GIN trigram indexes in schema and migration. Sale ID search no longer casts UUID to text with `%term%`; full UUID queries now use exact `eq(sales.id, normalizedQuery)`, while customer-name search remains textual. The listing plan analyzer can now include search-plan checks when `PERFORMANCE_SEARCH_TERM` is provided.

**Verificacao:**
- Neon docs checked with `ctx7`: `pg_trgm` is enabled with `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
- `bun --cwd apps/web vitest run src/db/listing-indexes.test.ts src/features/sales/queries.test.ts src/features/products/queries.test.ts` passed.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun --cwd apps/web vitest run src/features/products/actions.test.ts` passed after a full-suite timeout in that unrelated file.
- `bun --cwd apps/web vitest run src/features/sales/actions.test.ts` passed after a full-suite timeout in that unrelated file.
- `bun --cwd apps/web vitest run --maxWorkers=1` passed: 99 files, 372 tests.

**Validacao nao executada:** `scripts/analyze-listing-plans.ts` was not run against a representative Neon dataset because this session does not have an approved `DATABASE_URL` plus `PERFORMANCE_ORGANIZATION_ID`/`PERFORMANCE_SEARCH_TERM` target.

**Risco residual:** Applying GIN indexes on large production tables can take time and should be done on an approved Neon branch/maintenance window. Query-plan validation still needs representative data after migration.

**Objetivo:** Prevent scans from `%term%` search at scale.

**Escopo exato:**
- Add `pg_trgm` extension if acceptable for Neon.
- Add GIN/trigram indexes for product/category/sales customer search.
- Prefer exact UUID/prefix search instead of casting UUID with `%term%`.

**Achados endereçados:** `PERF-002`.

**Arquivos prováveis:**
- `packages/db/src/migrations/*.sql`
- `packages/db/src/schema.ts`
- `apps/web/src/features/products/queries.ts`
- `apps/web/src/features/sales/queries.ts`
- `scripts/analyze-listing-plans.ts`

**O que não deve ser alterado:**
- No visible search UX changes except stricter ID matching.

**Testes necessários:**
- Query tests.
- Optional `db:analyze:listings` on representative data.

**Critério de aceite:**
- Search plan uses intended indexes on realistic dataset or documented fallback.

**Riscos:**
- Migration lock/time on large tables.

**Rollback:**
- Drop indexes in forward migration.

### PR 18 - Paginate Product Picker for Sales

**Status:** Concluido em 2026-07-10.

**Resultado:** The sales page no longer loads the full sellable product catalog. Product options for the create-sale dialog are now fetched on demand through a `sales:write` server action backed by a paginated/cursor-based query. The dialog loads the first page when opened, searches product names with debounce, supports loading more options, and keeps selected products in client state so price preview and expected-unit-price validation remain intact.

**Verificacao:**
- `bun --cwd apps/web vitest run src/features/sales/queries.test.ts src/components/sales/sales-panel.test.ts` passed.
- `bun x ultracite check` passed.
- `bun run typecheck` passed.
- `bun --cwd apps/web vitest run --maxWorkers=1` passed: 99 files, 373 tests.

**Decisao de escopo:** The PR did not change sale financial calculations or server-side sale validation. It only changed how selectable products are loaded into the dialog.

**Risco residual:** No browser/E2E run was executed in this session because the project requires an isolated E2E database. The source/unit tests cover the data-loading boundary, but the interactive combobox flow should still be covered in Playwright later.

**Objetivo:** Avoid loading all sellable products into the sales dialog.

**Escopo exato:**
- Add server-side search/pagination endpoint or server action for sale product options.
- Update `CreateSaleDialog` to query options on demand.

**Achados endereçados:** `PERF-007`.

**Arquivos prováveis:**
- `apps/web/src/features/sales/queries.ts`
- `apps/web/src/components/sales/create-sale-dialog.tsx`
- `apps/web/src/features/sales/actions.ts`
- `apps/web/src/app/(app)/vendas/(list)/page.tsx`

**O que não deve ser alterado:**
- No sale calculation changes.

**Testes necessários:**
- Dialog searches/paginates.
- Sale creation still validates selected product server-side.

**Critério de aceite:**
- Page no longer passes full product catalog to client.

**Riscos:**
- More client/server interaction complexity.

**Rollback:**
- Restore eager options while keeping server validation.

---

## DevOps/Produção

### PR 19 - Move Image Reconcile from Vercel Cron to Inngest

**Status:** Concluido em 2026-07-10.

**Resultado:** Moved the daily product-image reconcile schedule from Vercel Cron to an Inngest scheduled function (`reconcile-product-images`, cron `0 4 * * *`). Extracted reconcile domain logic into `features/products/image-reconcile.ts`, kept the manual HTTP endpoint for operational diagnostics only, removed the `vercel.json` cron entry, and replaced generic `CRON_SECRET` wiring with route-specific `PRODUCT_IMAGE_RECONCILE_SECRET` and `INTERNAL_R2_HEALTH_SECRET`.

**Verificacao:**
- Inngest docs checked with `ctx7`: scheduled functions support `createFunction` with cron triggers.
- `bun --cwd apps/web vitest run src/lib/inngest-functions.test.ts src/app/api/internal/product-images/reconcile/route.test.ts src/app/api/internal/health/r2/route.test.ts src/lib/env.test.ts src/lib/production-preflight.test.ts src/lib/deployment-smoke.test.ts src/lib/ci-workflow.test.ts src/lib/playwright-env.test.ts` passed.
- `bun --cwd apps/web vitest run src/lib/inngest-functions.test.ts src/features/products/image-reconcile-inngest.test.ts src/lib/inngest-route-source.test.ts src/lib/lib-boundary.test.ts` passed.
- `bun run typecheck` passed.
- `bun x ultracite check` passed.
- `bun --cwd apps/web vitest run --maxWorkers=1` passed: 100 files, 375 tests.
- Source search found no active `CRON_SECRET`/`E2E_CRON_SECRET` references in apps, scripts, workflows, `.env.example`, `turbo.json`, `vercel.json`, README, runbooks, or architecture docs.

**Validacao nao executada:** Inngest cloud sync/schedule execution was not verified against a deployed app in this session. After deploy, confirm the Inngest app has synced `reconcile-product-images` and that the schedule appears in the Inngest dashboard.

**Risco residual:** The manual endpoint remains available by design for diagnostics, protected by `PRODUCT_IMAGE_RECONCILE_SECRET`; operational runbooks must use that secret, not an old cron secret.

**Objetivo:** Use durable scheduled jobs for image reconciliation.

**Escopo exato:**
- Add Inngest scheduled function with cron `0 4 * * *`.
- Remove `crons` entry from root `vercel.json` after verification.
- Remove or simplify `PRODUCT_IMAGE_RECONCILE_SECRET` if no direct public cron endpoint remains.
- Keep manual/admin-triggered endpoint only if needed, protected consistently.

**Achados endereçados:** `DEVOPS-001`, user cron question.

**Arquivos prováveis:**
- `apps/web/src/lib/inngest-functions.ts`
- `apps/web/src/app/api/inngest/route.ts`
- `apps/web/src/app/api/internal/product-images/reconcile/route.ts`
- `vercel.json`
- `.env.example`
- `docs/runbooks/deploy-vercel.md`
- `apps/web/src/lib/production-preflight.ts`

**O que não deve ser alterado:**
- Do not change reconciliation deletion rules in this PR.

**Testes necessários:**
- Inngest function invokes reconcile service.
- Manual endpoint, if kept, has consistent auth.
- `bun run test`
- `bun run build`

**Critério de aceite:**
- Daily reconcile is scheduled by Inngest.
- Vercel Cron secret mismatch no longer exists.

**Riscos:**
- Inngest schedule requires synced deployed app/function.

**Rollback:**
- Re-add Vercel Cron entry and restore `CRON_SECRET` auth path.

### PR 20 - Make Admin a First-Class Vercel Project

**Status:** Concluido em 2026-07-10 para codigo, docs e verificacoes locais.

**Resultado:** Replaced the root-level `vercel.admin.json` with explicit app-local `apps/admin/vercel.json` for the separate Vercel project rooted at `apps/admin`. Added admin `/api/health`, admin deployment smoke support (`bun run deploy:smoke:admin`) with normal health validation and Vercel Authentication/deployment-protection mode, manual CI smoke job, env documentation, and Sentry instrumentation/source-map parity for the admin app.

**Verificacao:**
- Vercel monorepo docs checked with `ctx7`: each deployed directory should be imported as a separate project and configured with the matching Root Directory.
- Next local docs checked for `src/instrumentation.ts` and Route Handlers.
- `bun --cwd apps/admin vitest run src/app/api/health/route.test.ts src/lib/deployment-smoke.test.ts` passed.
- `bun --cwd apps/web vitest run src/lib/ci-workflow.test.ts` passed.
- `bun run typecheck:admin` passed.
- `bun run build:admin` passed and emitted `/api/health` as a dynamic route.
- `bun run test:admin` passed.
- `bun x ultracite check` passed.
- Source search found no active root `vercel.admin.json`; remaining references are only this plan and the runbook note explaining its removal.

**Validacao nao executada:** `bun run deploy:smoke:admin` was not run against a real preview/prod admin URL in this session because no deployed admin URL or Vercel-authenticated smoke context was provided. Use `ADMIN_DEPLOYMENT_SMOKE_URL=... bun run deploy:smoke:admin` when the route is reachable, or add `ADMIN_DEPLOYMENT_SMOKE_PROTECTED=true` when validating that Vercel Authentication blocks anonymous access with `401/403`.

**Risco residual:** Vercel Authentication/deployment protection remains platform state and cannot be proven from the repo. Before promotion, the operator must verify the `apps/admin` Vercel project has Root Directory `apps/admin`, source files outside the root included, and production/previews protected.

**Objetivo:** Make admin deployment explicit, repeatable, and protected.

**Escopo exato:**
- Add `apps/admin/vercel.json` or documented Vercel project root config.
- Remove ambiguous `vercel.admin.json` or make its usage explicit.
- Add admin health route.
- Add admin deployment smoke script.
- Add Sentry/instrumentation parity where appropriate.

**Achados endereçados:** `DEVOPS-003`, `DEVOPS-004`.

**Arquivos prováveis:**
- `apps/admin/vercel.json`
- `vercel.admin.json`
- `apps/admin/src/app/api/health/route.ts`
- `apps/admin/src/instrumentation.ts`
- `scripts/smoke-admin-deployment.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/runbooks/deploy-vercel.md`

**O que não deve ser alterado:**
- No admin product feature changes.

**Testes necessários:**
- `bun run build:admin`
- Admin smoke against preview/prod URL.

**Critério de aceite:**
- Admin deploy does not depend on hidden dashboard-only config.
- Vercel Authentication/deployment protection is documented as required.

**Riscos:**
- Vercel dashboard state cannot be fully tested from repo.

**Rollback:**
- Revert app-local config and use existing manual config.

### PR 21 - Harden CI and Migration Operations

**Status:** Concluido em 2026-07-10 para codigo, CI, docs e verificacoes locais.

**Resultado:** CI now pins `oven-sh/setup-bun` to Bun `1.3.11`, matching `packageManager`. Root aggregate gates were added: `build:all`, `check:all`, `typecheck:all`, and `test:all`. Database migrations/push now run through `scripts/require-database-url-direct.ts`, which refuses missing/invalid `DATABASE_URL_DIRECT` and refuses reuse of `DATABASE_URL`; `packages/db/drizzle.config.ts` no longer falls back from `DATABASE_URL_DIRECT` to `DATABASE_URL`. Added a manual CI `restore-drill-checklist` job and `scripts/check-restore-drill.ts` to require explicit restore drill evidence before risky operational work.

**Verificacao:**
- `ctx7` setup-bun docs checked: exact `bun-version` pinning is supported, and packageManager can define the intended version.
- `bun --cwd apps/web vitest run src/lib/ci-workflow.test.ts src/lib/operations-gates.test.ts` passed.
- `bun scripts/require-database-url-direct.ts` passed with synthetic separate runtime/direct Postgres URLs and printed a redacted target.
- `bun scripts/check-restore-drill.ts` passed with synthetic restore drill evidence.
- Source search found no `bun-version: latest`, `DATABASE_URL_DIRECT ?? DATABASE_URL`, `DATABASE_URL ??`, or `bu n` typo in the touched operational files.
- `bun run typecheck:all` passed.
- `bun run check:all` passed.
- `bun run test:all` passed.
- `bun run build:all` passed.

**Risco residual:** The restore drill job validates evidence variables only; it does not perform a Neon restore automatically. The actual restore/PITR drill remains an operator action that must be done before filling the checklist. `bun run build:all` emitted the existing local Postgres SSL warning when an env URL uses `sslmode=require`; production docs continue to require `sslmode=verify-full`.

**Objetivo:** Make production gates deterministic and safer.

**Escopo exato:**
- Pin Bun in CI to `1.3.11` or derive from `packageManager`.
- Add wrapper for migrations requiring `DATABASE_URL_DIRECT`.
- Remove `DATABASE_URL_DIRECT ?? DATABASE_URL` fallback.
- Add restore drill/checklist script or documented CI/manual job.
- Add `build:all`, `check:all`, `typecheck:all`, `test:all`.

**Achados endereçados:** `ARCH-001`, `DEVOPS-005`, `DEVOPS-007`, `DEVOPS-008`.

**Arquivos prováveis:**
- `.github/workflows/ci.yml`
- `packages/db/drizzle.config.ts`
- `scripts/*migration*.ts`
- `package.json`
- `turbo.json`
- `docs/runbooks/saas-organization-migration-runbook.md`

**O que não deve ser alterado:**
- Do not auto-run production migrations on deploy.

**Testes necessários:**
- CI dry-equivalent local commands.
- Migration wrapper unit/source tests.

**Critério de aceite:**
- CI runtime matches repo.
- Migrations cannot silently use runtime DB URL.

**Riscos:**
- Existing local dev migration habits may break.

**Rollback:**
- Restore previous script while keeping docs warning.

---

## Refactors

### PR 22 - Reorganize Monorepo Boundaries and `apps/web/src/lib`

**Status:** Concluido em 2026-07-10.

**Resultado:** Reorganized `apps/web/src/lib` by intention without changing behavior. Provider/webhook/email modules moved to `apps/web/src/integrations/{asaas,woovi,resend,webhooks}`. Operational preflight/smoke/E2E/performance-plan helpers moved to `apps/web/src/ops`. Public API route handlers remain thin and import provider handlers from `src/integrations`; onboarding imports the Resend email service from the integration module. Added `integration-boundary.test.ts` and expanded `lib-boundary.test.ts` so provider/webhook/ops modules do not drift back into shared `lib`.

**Verificacao:**
- `bun --cwd apps/web vitest run src/lib/lib-boundary.test.ts src/lib/integration-boundary.test.ts src/integrations/asaas/webhook.test.ts src/integrations/woovi/webhook.test.ts src/integrations/resend/email-service-source.test.ts src/ops/deployment-smoke.test.ts src/ops/production-preflight.test.ts src/ops/playwright-env.test.ts src/ops/postgres-plan.test.ts src/ops/ci-workflow.test.ts src/ops/operations-gates.test.ts` passed.
- Source search found no remaining imports from old `@/lib/{asaas,woovi,resend,email-service,deployment-smoke,production-preflight,postgres-plan,playwright-env,e2e-*,webhook-request-limits}` paths.
- `bun run typecheck` passed.
- `bun run check` passed.
- `bun run test` passed: 102 web test files, 389 web tests, plus package dependency tests.
- `bun run build` passed.

**Decisao de escopo:** Provider/webhook handlers were placed under top-level `src/integrations` instead of `src/features/integrations` because current feature boundary tests intentionally prohibit feature runtime modules from direct `@/db` access, while these webhook handlers still own capture/outbox writes. This keeps the refactor honest without weakening existing feature boundaries.

**Risco residual:** This PR does not yet extract provider integrations into standalone packages, and `src/lib` still contains genuine app cross-cutting runtime utilities such as auth/session/env/audit/cache/rate-limit/Sentry. Future package extraction should happen only when reuse across apps justifies it.

**Objetivo:** Turn the current mixed `lib` area into intention-based modules/packages.

**Escopo exato:**
- Move billing integrations to `features/billing` or `packages/billing` based on reuse.
- Move webhook/provider-specific code to `features/integrations/{asaas,woovi,resend}` or package-owned modules.
- Move operational scripts/preflight/smoke logic under `apps/web/src/ops` or `packages/ops` only if shared.
- Keep thin route handlers in `app/api`.
- Add/extend boundary tests.
- Add Turborepo tasks for all app/package checks.

**Achados endereçados:** `ARCH-002`, `ARCH-003`, DX concerns.

**Arquivos prováveis:**
- `apps/web/src/lib/**`
- `apps/web/src/features/**`
- `packages/billing/src/**`
- `packages/events/src/**`
- `packages/platform/src/**`
- `apps/web/src/lib/*boundary*.test.ts`
- `turbo.json`
- `package.json`

**O que não deve ser alterado:**
- No behavior changes.
- No DB migrations.

**Testes necessários:**
- Boundary tests.
- `bun run test`
- `bun run typecheck`
- `bun run build`

**Critério de aceite:**
- `apps/web/src/lib` contains only true cross-cutting app utilities.
- Provider/domain/ops code lives by intention.

**Riscos:**
- Import churn and hidden circular deps.

**Rollback:**
- Revert file moves.

### PR 23 - Finish DB Import Migration

**Status:** Concluido em 2026-07-10.

**Resultado:** App runtime imports now use package ownership directly through `@polaris/db`, `@polaris/db/schema`, and `@polaris/db/tenant-context` instead of the legacy `@/db` wrappers. The `apps/web/src/db` wrappers remain only as compatibility shims with wrapper-focused tests. Added a DB boundary test preventing new runtime source files outside `src/db` from importing legacy `@/db/*` paths.

**Verificacao:**
- `bun --cwd apps/web vitest run src/lib/db-boundary.test.ts src/lib/boundary-test-helpers.test.ts src/features/catalog/server.test.ts src/features/products/queries.test.ts src/integrations/asaas/webhook.test.ts src/ops/playwright-env.test.ts` passed.
- Source search found `@/db` only in wrapper tests and boundary-helper examples.
- `bun run typecheck` passed.
- `bun run check` passed.
- `bun run test` passed: 102 web test files, 390 web tests, plus package dependency tests.
- `bun run build` passed.

**Risco residual:** The compatibility wrappers still exist under `apps/web/src/db` so existing alias tests and any external assumptions remain stable. A later cleanup can delete those wrappers only after confirming no consumers rely on the web alias surface.

**Objetivo:** Stop new code from relying on legacy `apps/web/src/db` wrappers.

**Escopo exato:**
- Migrate app imports to `@polaris/db` where practical.
- Keep wrappers only if needed for alias compatibility.
- Add boundary test preventing new `@/db/*` imports outside wrappers.

**Achados endereçados:** `ARCH-004`.

**Arquivos prováveis:**
- `apps/web/src/**/*.ts`
- `apps/web/src/**/*.tsx`
- `apps/web/src/db/**`
- `apps/web/src/lib/db-boundary.test.ts`

**O que não deve ser alterado:**
- No schema or migration changes.

**Testes necessários:**
- Typecheck.
- Boundary tests.

**Critério de aceite:**
- DB ownership is visibly in `@polaris/db`.

**Riscos:**
- Alias/import churn.

**Rollback:**
- Restore wrapper imports.

---

## Melhorias Pós-MVP

### PR 24 - Add Workspace/Account Minimal Page

**Status:** Concluido em 2026-07-10.

**Resultado:** The existing `Configuracoes` page now includes a minimal one-user account surface before operational settings. It shows workspace name, authenticated user name/email/role, billing status/plan/next cycle, billing email fallback, and support/data-request guidance. Billing details are loaded through `features/account/server.ts` with tenant context; `src/app` and UI components still avoid direct DB access. No invitations or multi-user management were added.

**Verificacao:**
- Next local docs checked for App Router pages and Server Components.
- `bun --cwd apps/web vitest run src/components/settings/account-settings-panel.test.ts "src/app/(app)/configuracoes/page.test.ts" src/lib/app-boundary.test.ts src/lib/component-boundary.test.ts src/lib/feature-boundary.test.ts` passed: 5 files, 14 tests.
- `bun run test` passed: 104 web test files, 392 web tests, plus package dependency tests.
- `bun run typecheck` passed.
- `bun run check` passed.
- `bun run build` passed.

**Decisao de escopo:** This PR keeps account management intentionally informational. Export/delete requests point to support, subscription management stays read-only, and multi-user invitations remain outside MVP to preserve the one-user-per-tenant model.

**Risco residual:** Support contact is now explicit through `SUPPORT_EMAIL` after PR 37. A future support/billing portal PR can replace the mailto guidance with provider-specific self-service links.

**Objetivo:** Give a one-user customer a minimal account/workspace surface.

**Escopo exato:**
- Show current user email/name, subscription status, support contact, export/delete request instructions.
- Show workspace name as account context without adding workspace switching or invitations.

**Achados endereçados:** product account/workspace gap.

**Arquivos prováveis:**
- `apps/web/src/app/(app)/configuracoes/page.tsx`
- `apps/web/src/components/settings/**`
- `docs/product/roadmap.md`

**O que não deve ser alterado:**
- No multi-user invitations.

**Testes necessários:**
- Page renders for owner.
- Subscription state visible.

**Critério de aceite:**
- User has a clear place for account/support/billing status.

**Riscos:**
- Could expand scope into full account management.

**Rollback:**
- Hide the page/section.

### PR 25 - Add Inventory Movements View

**Status:** Concluido em 2026-07-10.

**Resultado:** Added a server-rendered `/estoque` route with filters for product, date range, and movement type. The new `getInventoryMovementsQuery` aggregates entries, sales, sale reversals, and write-offs into a common inventory movement contract while preserving tenant context. The sidebar now links to `Estoque`, and product detail pages include a shortcut to `/estoque?productId=<id>`.

**Verificacao:**
- `bun --cwd apps/web vitest run "src/app/(app)/estoque/page.test.ts" src/features/products/queries.test.ts src/lib/app-boundary.test.ts src/lib/feature-boundary.test.ts` passed: 4 files, 13 tests.
- `bun run typecheck` passed.
- `bun run check` passed.
- `bun run test` passed: 105 web test files, 394 web tests, plus package dependency tests.
- `bun run build` passed and emitted `/estoque` as a Partial Prerender route.

**Decisao de escopo:** This PR adds discoverability and auditability only. It does not redesign stock valuation, change existing product-detail history calculations, or add export/reporting flows.

**Risco residual:** The page caps product filter options and movement rows for responsive server rendering. Very large tenants may later need cursor pagination and indexed date/type-specific query-plan validation.

**Objetivo:** Make stock operations discoverable beyond product detail menus.

**Escopo exato:**
- Add movement list filtered by product/date/type.
- Link from product detail and sidebar if useful.

**Achados endereçados:** product stock discoverability gap.

**Arquivos prováveis:**
- `apps/web/src/app/(app)/estoque/**`
- `apps/web/src/features/products/history.ts`
- `apps/web/src/components/app-sidebar.tsx`

**O que não deve ser alterado:**
- No stock valuation redesign.

**Testes necessários:**
- Movement list query tests.
- E2E basic navigation.

**Critério de aceite:**
- Operator can audit stock movement without opening each product.

**Riscos:**
- Adds another route before core production hardening is complete.

**Rollback:**
- Remove route/sidebar entry.

---

## First PR to Implement

**PR 01 - Patch Critical Dependency Advisories** was implemented first and is complete.

Reason: it is the safest, smallest, and most urgent blocker. It reduces known security exposure before touching auth, billing, RLS, cron, or monorepo structure. After PR 01 passes, implement PR 02 and PR 03 before broader architecture changes.

Next implementation target: continue local hardening while external production access remains unresolved. PR 01 through PR 28 and PR 30 through PR 40 are marked complete; PR 29 remains not completed because Vercel project access/linking and explicit Neon live-smoke approval are still missing.
