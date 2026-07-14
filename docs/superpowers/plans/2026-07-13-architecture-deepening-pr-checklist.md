# Architecture Deepening PR Checklist

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reavaliar cada sugestão do relatório arquitetural e implementar, em PRs pequenos e verificáveis, apenas as mudanças que continuam pertinentes e benéficas.

**Architecture:** The plan favors real seams already proven by two or more callers/adapters, keeps changes local to existing modules, and avoids broad package extraction. Each PR must update this checklist after implementation with files changed, verification commands and residual risk.

**Tech Stack:** Bun, Turborepo, Next.js App Router, React 19, TypeScript, Vitest, Drizzle, Better Auth, Inngest, Vercel CI, Ultracite/Biome.

## Global Constraints

- Do not open local URLs or visual artifacts.
- `rg` is unavailable in this environment; use `git grep`, `Get-ChildItem`, `Select-String`.
- Do not commit or push unless explicitly requested.
- Before writing Next.js code, read the relevant local Next guide under `node_modules/next/dist/docs/` when API behavior is uncertain.
- Use `bun x ultracite fix` only when a commit is requested or formatting is explicitly needed; otherwise run the narrowest useful tests/checks.
- After each PR is implemented, update this document before moving to the next PR.

---

## Review Verdicts

### Suggestion 1 - Platform outbox/admin events

Verdict: Keep.

Reasoning:

- The suggestion is pertinent: admin retry currently imports `@polaris/db` and calls `@polaris/events` directly from the app action.
- It is beneficial: it moves operational mutation policy and audit into the platform module, matching billing and organization admin mutations.
- It is low-to-medium risk if implemented as a small platform wrapper first.

Assigned PR: PR-03.

### Suggestion 2 - Webhook intake module

Verdict: Keep, but split after lower-risk operational guardrails.

Reasoning:

- The repeated webhook flow is real across Asaas, Woovi and Resend.
- It is beneficial because capture/outbox/status semantics are operational invariants, not provider-specific UI code.
- It is higher risk than CI/admin guardrails because provider security checks must remain explicit.

Assigned PR: PR-05.

### Suggestion 3 - Cache invalidation module

Verdict: Keep.

Reasoning:

- The suggestion is pertinent because products, sales and catalog actions each encode route/tag blast radius.
- It is beneficial if named by domain mutation events, not as a generic cache router.
- It should wait until operational PRs are complete because it touches multiple user-facing write paths.

Assigned PR: PR-06.

### Suggestion 4 - Product category validation inside transaction

Verdict: Keep.

Reasoning:

- The category invariant belongs with product writes.
- It is beneficial because it removes action-level knowledge and closes the race between pre-check and write.
- It has a clear verification path through existing product server/action tests.

Assigned PR: PR-07.

### Suggestion 5 - Sale idempotency behind sale module

Verdict: Keep.

Reasoning:

- The action currently knows a database constraint name and conflict shape.
- Moving "create once" semantics into the sale module improves locality for concurrency policy.
- It should be done after product/category and cache work to reduce simultaneous blast radius.

Assigned PR: PR-08.

### Suggestion 6 - Operational date bounds module

Verdict: Keep.

Reasoning:

- Dashboard and sales duplicate the same domain read rule.
- The module is deep enough because it hides SQL, fallback date behavior and cache/tag choice behind one concept.
- It is low risk and can be handled before larger UI/page-loader work.

Assigned PR: PR-09.

### Suggestion 7 - Split app-session from onboarding bootstrap

Verdict: Keep, but defer until after core write modules.

Reasoning:

- The suggestion is pertinent: `app-session` currently mixes request context and onboarding bootstrap.
- It is beneficial for AI-navigability and module naming.
- It is risky because it contains advisory lock, user context, tenant context, billing and audit behavior.

Assigned PR: PR-10.

### Suggestion 8 - Deepen `@polaris/platform` internals

Verdict: Keep.

Reasoning:

- Repeated SQL result parsing and default DB adapter helpers are objective duplication.
- It is beneficial if kept internal and does not create new public repository abstractions.
- It pairs well with admin outbox/profile work.

Assigned PR: PR-04.

### Suggestion 9 - Inject DB into auth/platform-auth factories

Verdict: Exclude from current PR train.

Reasoning:

- It may be beneficial for tests, but current evidence shows module mocking pain rather than a runtime bug or caller complexity problem.
- Better Auth adapter typing may introduce broad churn without a clear product/runtime payoff.
- Revisit only if platform-auth tests or auth factory changes become a blocker during another PR.

Excluded PR reason: not enough benefit-to-risk for this batch.

### Suggestion 10 - Fix `@polaris/ui` public interface mismatch

Verdict: Keep.

Reasoning:

- The package manifest and actual app imports disagree, which makes the declared interface misleading.
- It is beneficial to either formalize exports or explicitly document/guard internal source-sharing.
- Start by fixing manifest dependencies and adding a source/dependency guard, then decide whether to widen exports.

Assigned PR: PR-11.

### Suggestion 11 - Shared app shell frame

Verdict: Exclude from current PR train.

Reasoning:

- The duplication is real, but the current frame also carries app-specific auth/session concerns.
- Extracting it before clarifying `@polaris/ui`'s interface risks making the UI package seam wider and fuzzier.
- Revisit after PR-11 if layout drift becomes a recurring change point.

Excluded PR reason: beneficial later, but currently lower leverage than UI package interface cleanup.

### Suggestion 12 - Admin perimeter source of truth

Verdict: Keep.

Reasoning:

- Current memory/docs and active source disagree about Cloudflare Access vs Vercel/Better Auth perimeter.
- It is beneficial because future reviews and production certification need one target.
- Implementation should avoid inventing external evidence; update docs/memory to reflect active source and existing guardrails.

Assigned PR: PR-02.

### Suggestion 13 - Admin E2E CI guard

Verdict: Keep and implement first.

Reasoning:

- This is a concrete false-positive guardrail risk.
- The change is narrow, testable and low risk.
- It makes the broader plan safer before deeper refactors.

Assigned PR: PR-01.

### Suggestion 14 - Page-load modules

Verdict: Keep, but late.

Reasoning:

- The page composition issue is real, but loaders can become shallow wrappers if extracted too early.
- It is beneficial after cache invalidation and read modules are clearer.

Assigned PR: PR-12.

### Suggestion 15 - Product/sales paginated list state

Verdict: Keep, but late and app-local.

Reasoning:

- Repeated cursor/filter/load-more behavior is real.
- It should not go to `packages/ui`; it belongs in an app-local interaction module.
- It should follow page-load and cache work so the data contracts are stable.

Assigned PR: PR-13.

### Suggestion 16 - Product price/markup field module

Verdict: Keep, but late and product-local.

Reasoning:

- Price/markup UI logic is repeated and domain-specific.
- It should remain under product UI/modules rather than generic UI.
- It is a clean UI-domain refactor once core architecture work settles.

Assigned PR: PR-14.

## PR Checklist

### PR-00 - Planning Artifact

Status: Implemented.

Purpose:

- Persist the review verdicts, PR ordering and update protocol.
- Explain which suggestions are excluded and why.

Files:

- Create: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`
- Existing source report: `docs/reports/architecture-deepening-review-2026-07-13.md`

Implementation checklist:

- [x] Review every suggestion from the architecture report.
- [x] Mark each suggestion as kept or excluded.
- [x] Assign kept suggestions to PRs.
- [x] Run documentation consistency verification.
- [x] Update this PR status to Implemented with verification output.

Verification:

- Command: `Get-Content -Raw docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`
- Expected: file exists, every suggestion 1-16 has a verdict, and excluded suggestions have explicit reasons.

Implementation log:

- 2026-07-13:
  - Files changed: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`.
  - Verification: `Get-Content -Raw docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`.
  - Result: checklist exists, suggestions 1-16 have verdicts, and excluded suggestions have explicit reasons.
  - Residual risk: this is a planning/documentation artifact; implementation correctness is tracked by each PR below.

### PR-01 - Admin E2E CI Secret Guard

Status: Implemented.

Purpose:

- Fix the CI workflow test so the `admin-e2e` job is specifically guarded by `secrets.ADMIN_E2E_DATABASE_URL`, not only the generic web `secrets.E2E_DATABASE_URL`.

Files:

- Modify: `apps/web/src/ops/ci-workflow.test.ts`
- Read-only evidence: `.github/workflows/ci.yml`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Add a focused assertion that the `admin-e2e` job contains `E2E_DATABASE_URL: ${{ secrets.ADMIN_E2E_DATABASE_URL }}`.
- [x] Keep the existing broad release-gate assertions.
- [x] Run the narrow CI workflow test.
- [x] Update this PR status and implementation log in this document.

Verification:

- Command: `bun test apps/web/src/ops/ci-workflow.test.ts`
- Expected: CI workflow tests pass.

Implementation log:

- 2026-07-13:
  - Files changed: `apps/web/src/ops/ci-workflow.test.ts`, `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`.
  - Verification: `bun test apps/web/src/ops/ci-workflow.test.ts`.
  - Result: 17 tests passed, 0 failed, 184 assertions.
  - Residual risk: this proves the checked-in workflow keeps the admin job wired to `secrets.ADMIN_E2E_DATABASE_URL`; it does not prove the secret exists in GitHub settings.

### PR-02 - Admin Perimeter Documentation Alignment

Status: Implemented.

Purpose:

- Align project memory/docs with the active admin perimeter: Better Auth/session plus platform admin grants and Vercel protection evidence, while preserving the guardrail that removed Cloudflare Access source tokens stay out of active source.

Files:

- Modify: `aidd_docs/memory/project-state.md`
- Modify if stale text remains: `docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md`
- Test: `apps/web/src/ops/ci-workflow.test.ts`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Replace stale Cloudflare Access ownership language in project memory with the active Vercel/Better Auth perimeter language.
- [x] Verify production readiness docs do not still require Cloudflare Access for current admin surfaces.
- [x] Keep active-source guard against reintroducing removed Cloudflare Access tokens.
- [x] Run the narrow CI workflow test if docs/source guard text is affected.
- [x] Update this PR status and implementation log.

Verification:

- Command: `Select-String -Path aidd_docs/memory/project-state.md,docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md -Pattern 'Cloudflare Access|Vercel Authentication|Better Auth'`
- Expected: current-state docs describe one active admin perimeter without contradictory Cloudflare Access requirements.

Implementation log:

- 2026-07-13:
  - Files changed: `aidd_docs/memory/project-state.md`, `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`.
  - Verification: `Select-String -Path aidd_docs/memory/project-state.md,docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md -Pattern 'Cloudflare Access|Vercel Authentication|Better Auth' -Context 1,1`.
  - Verification: `bun test apps/web/src/ops/ci-workflow.test.ts`.
  - Result: memory now names the active admin perimeter as separate `apps/admin` Vercel project with Vercel Authentication/deployment protection plus Better Auth/platform admin grants; production readiness plan already matched that direction; CI workflow tests passed with 17 tests, 0 failed, 184 assertions.
  - Residual risk: local docs/tests still cannot prove live Vercel project protection is enabled; production certification evidence remains external.

### PR-03 - Platform-Audited Outbox Retry

Status: Implemented.

Purpose:

- Move admin outbox retry behavior behind `@polaris/platform` and record a platform audit event.

Files:

- Create or modify: `packages/platform/src/platform-events.ts`
- Modify: `packages/platform/package.json`
- Test: `packages/platform/src/platform-events.test.ts`
- Modify: `apps/admin/src/app/events/actions.ts`
- Test: `apps/admin/src/app/events/actions.test.ts` if action coverage exists or create focused test if absent.
- Optional guard: `apps/admin/src/lib/admin-boundary.test.ts` or existing boundary helper location.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write package test proving retry writes audit metadata.
- [x] Add `retryPlatformOutboxEvent(input, mutationDb?)`.
- [x] Update admin action to call platform module and remove direct `@polaris/db`/`@polaris/events` imports.
- [x] Add or update source guard for admin runtime imports if practical in the same PR.
- [x] Run package/platform tests and admin action tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun test packages/platform/src/platform-events.test.ts`
- Command: `bun test apps/admin/src/app/events/actions.test.ts` when test exists.
- Expected: retry policy and audit are covered without direct admin DB call.

Implementation log:

- 2026-07-13:
  - Files changed: `packages/platform/src/platform-events.ts`, `packages/platform/src/platform-events.test.ts`, `packages/platform/package.json`, `bun.lock`, `apps/admin/src/app/events/actions.ts`, `apps/admin/src/app/events/actions.test.ts`, `apps/admin/src/app/events/page.tsx`, `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`.
  - Verification: `bun --cwd packages/platform vitest run src/platform-events.test.ts`.
  - Verification: `bun --cwd apps/admin vitest run src/app/events/actions.test.ts`.
  - Verification: `bun --cwd packages/platform typecheck`.
  - Verification: `bun --cwd apps/admin typecheck`.
  - Verification: `git grep -n '@polaris/db\|@polaris/events' -- apps/admin/src/app/events packages/platform/src/platform-events.ts packages/platform/package.json`.
  - Result: platform events tests passed with 3 tests; admin events action tests passed with 2 tests; both typechecks passed; grep showed `@polaris/db`/`@polaris/events` only in the platform package manifest for this slice.
  - Residual risk: retry audit records a retry request, not a proven row-state transition, because the existing `@polaris/events.retryOutboxEvent` returns `void`. A later events module refinement can return affected-row status if operators need stricter UI feedback.

### PR-04 - Platform Internal Query/Parsing Helpers

Status: Implemented.

Purpose:

- Reduce repeated raw SQL result parsing and DB adapter defaults inside `@polaris/platform` without adding new public repository interfaces.

Files:

- Create: `packages/platform/src/internal/query-results.ts`
- Modify: `packages/platform/src/platform-directory.ts`
- Modify: `packages/platform/src/platform-dashboard.ts`
- Modify: `packages/platform/src/platform-billing.ts`
- Modify: `packages/platform/src/platform-audit-events.ts`
- Modify: `packages/platform/src/platform-support-notes.ts`
- Tests: `packages/platform/src/internal/query-results.test.ts`, affected `packages/platform/src/*.test.ts`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Add tests for parser behavior with arrays, `{ rows }`, bigint, dates, empty values.
- [x] Move duplicated parsing helpers into internal helper.
- [x] Replace local copies in platform modules.
- [x] Fix `platform-dashboard` health path if it ignores the injected queryable DB.
- [x] Run platform package tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd packages/platform vitest run`
- Result: passed, 9 test files, 30 tests.
- Command: `bun --cwd packages/platform vitest run src/platform-dashboard.test.ts src/internal/query-results.test.ts`
- Result: passed, 2 test files, 4 tests.
- Command: `bun --cwd packages/platform typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `git grep -n "const toRows\|const toNumber\|const toIsoString\|const toStringValue\|const toSafeString\|const toNullableString" -- packages/platform/src`
- Result: no local duplicate parser helper declarations found.

Implementation log:

- Implemented `packages/platform/src/internal/query-results.ts` and `packages/platform/src/internal/query-results.test.ts`.
- Reused the internal parser helpers from platform dashboard, billing, directory, audit events, and support notes modules.
- Fixed `getPlatformDashboardData(db)` so the database health query uses the injected queryable DB instead of the package default DB.
- Updated `packages/platform/src/platform-dashboard.test.ts` to prove the injected DB receives the health, summary, and event queries.
- Residual risk: nullable string normalization now treats empty strings as absent in shared helper paths; current platform tests pass, but UI assumptions around deliberately empty fields should be watched in future feature work.

### PR-05 - Webhook Intake Module

Status: Implemented.

Purpose:

- Centralize common webhook capture/outbox/status behavior while keeping provider-specific verification explicit.

Files:

- Create: `apps/web/src/integrations/webhooks/intake.ts`
- Test: `apps/web/src/integrations/webhooks/intake.test.ts`
- Modify: `apps/web/src/integrations/asaas/webhook.ts`
- Modify: `apps/web/src/integrations/woovi/webhook.ts`
- Modify: `apps/web/src/integrations/resend/webhook.ts`
- Update provider tests under `apps/web/src/app/api/webhooks/*/route.test.ts` or integration tests as needed.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write intake tests for capture/enqueue/status behavior.
- [x] Add normalized intake interface that receives provider, event id, event type, redacted payload and raw body.
- [x] Move shared capture/outbox/status updates to intake.
- [x] Keep token/signature verification in provider files.
- [x] Run webhook tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/integrations/webhooks/intake.test.ts src/integrations/asaas/webhook.test.ts src/integrations/woovi/webhook.test.ts src/app/api/webhooks/asaas/route.test.ts src/app/api/webhooks/woovi/route.test.ts src/app/api/webhooks/resend/route.test.ts`
- Result: passed, 6 test files, 22 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.

Implementation log:

- Implemented `apps/web/src/integrations/webhooks/intake.ts` with `observeWebhookIntake` and `markWebhookIntakeProcessed`.
- Added `apps/web/src/integrations/webhooks/intake.test.ts` covering capture, observed outbox enqueue, explicit correlation/topic/idempotency overrides, and webhook status updates.
- Updated Asaas, Woovi, and Resend webhook handlers to delegate shared intake behavior while keeping token/signature verification, raw body parsing, provider event id extraction, and provider-specific reconciliation in provider modules.
- Updated Asaas and Woovi integration tests so their static contract expects intake delegation instead of direct event-package calls.
- Provider route tests still prove invalid auth/signature/payload behavior and valid capture/enqueue/reconciliation behavior.

### PR-06 - Domain Cache Invalidation Module

Status: Implemented.

Purpose:

- Move mutation-to-path/tag knowledge from actions into a domain invalidation module.

Files:

- Create: `apps/web/src/lib/domain-invalidation.ts`
- Test: `apps/web/src/lib/domain-invalidation.test.ts`
- Modify: `apps/web/src/features/products/actions.ts`
- Modify: `apps/web/src/features/sales/actions.ts`
- Modify: `apps/web/src/features/catalog/actions.ts`
- Update related action tests.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write tests for product, sale and catalog mutation invalidation.
- [x] Add event-named invalidation functions.
- [x] Replace local helper functions in actions.
- [x] Keep invalidation after successful mutations only.
- [x] Run action and invalidation tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/lib/domain-invalidation.test.ts src/features/products/actions.test.ts src/features/sales/actions.test.ts src/features/catalog/actions.test.ts`
- Result: passed, 4 test files, 55 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path 'apps/web/src/features/products/actions.ts','apps/web/src/features/sales/actions.ts','apps/web/src/features/catalog/actions.ts' -Pattern 'next/cache|revalidatePath|updateTag|refresh\('`
- Result: no matches.

Implementation log:

- Implemented `apps/web/src/lib/domain-invalidation.ts` with event-named invalidation functions for product creation, product detail changes, product inventory changes, sale changes, and catalog configuration changes.
- Added `apps/web/src/lib/domain-invalidation.test.ts` to pin the exact route/tag/refresh behavior.
- Replaced local cache helper functions in product, sale, and catalog actions with domain invalidation calls placed after successful writes.
- Existing action tests still prove no invalidation occurs when validation, tenant ownership, lost updates, or idempotency early returns prevent mutation success.

### PR-07 - Product Category Validation Locality

Status: Implemented.

Purpose:

- Move product category tenant validation into product write transactions.

Files:

- Modify: `apps/web/src/features/products/server.ts`
- Modify: `apps/web/src/features/products/actions.ts`
- Test: `apps/web/src/features/products/server.test.ts`
- Test: `apps/web/src/features/products/actions.test.ts`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write product server tests for missing/cross-tenant category.
- [x] Validate category inside `createProductWithInitialStock`.
- [x] Validate category inside `updateProductWithPriceHistory`.
- [x] Remove action-level category pre-check if tests prove friendly errors remain.
- [x] Run product server/action tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/features/products/server.test.ts src/features/products/actions.test.ts`
- Result: passed, 2 test files, 29 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/features/products/actions.ts -Pattern 'getProductCategoryById|Selecione uma categoria valida|features/catalog/server'`
- Result: no matches.

Implementation log:

- Added `apps/web/src/features/products/server.test.ts` covering missing/cross-tenant category rejection for product creation and update inside the tenant transaction.
- Added `assertCategoryBelongsToOrganization` in `apps/web/src/features/products/server.ts` and called it from `createProductWithInitialStock` and `updateProductWithPriceHistory`.
- Removed action-level category lookup/pre-check from `apps/web/src/features/products/actions.ts`; the action no longer imports the catalog server module or knows the category validation error.
- Updated product action test harnesses so successful create/update transactions include a valid category lookup.

### PR-08 - Sale Create Once Interface

Status: Implemented.

Purpose:

- Move idempotency lookup/conflict handling from sale action into sale module.

Files:

- Modify: `apps/web/src/features/sales/server.ts`
- Modify: `apps/web/src/features/sales/actions.ts`
- Test: `apps/web/src/features/sales/server.test.ts`
- Test: `apps/web/src/features/sales/actions.test.ts`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write sale server tests for duplicate key and unique conflict recovery.
- [x] Add `createSaleOnce`.
- [x] Remove constraint-name handling from action.
- [x] Keep action-level parsing/auth/cache responsibilities.
- [x] Run sale tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/features/sales/server.test.ts src/features/sales/actions.test.ts`
- Result: passed, 2 test files, 21 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/features/sales/actions.ts -Pattern 'sales_organization_idempotency_key_unique_idx|isIdempotencyConflict|findExistingSaleByIdempotencyKey|23505|constraint'`
- Result: no matches.

Implementation log:

- Added `createSaleOnce` to `apps/web/src/features/sales/server.ts`, returning `{ saleId, created }`.
- Moved the idempotency unique-constraint detection and concurrent insert recovery into the sales server module.
- Kept the action responsible for auth, schema parsing, lazy catalog rule loading, and cache invalidation only when `created` is true.
- Updated `apps/web/src/features/sales/server.test.ts` for existing-sale short-circuit and concurrent unique-conflict recovery.
- Updated `apps/web/src/features/sales/actions.test.ts` static contract so the action delegates create-once semantics and no longer contains the SQL constraint name.

### PR-09 - Operational Date Bounds Module

Status: Implemented.

Purpose:

- Replace duplicated dashboard/sales date-bounds query with one named module.

Files:

- Create: `apps/web/src/features/operations/date-bounds.ts`
- Test: `apps/web/src/features/operations/date-bounds.test.ts`
- Modify: `apps/web/src/features/dashboard/server.ts`
- Modify: `apps/web/src/features/sales/server.ts`
- Update affected tests.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write bounds tests for empty, sales-only, stock-only and mixed data.
- [x] Add `getOperationalDateBounds`.
- [x] Replace duplicated implementations.
- [x] Run dashboard/sales/date-bounds tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/features/operations/date-bounds.test.ts src/features/dashboard/server.test.ts src/features/sales/server.test.ts`
- Result: passed, 3 test files, 12 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/features/dashboard/server.ts,apps/web/src/features/sales/server.ts -Pattern 'minOccurredOn|minStockedOn|formatDateInputValue|getOperationalDateBounds'`
- Result: only `getOperationalDateBounds` import and alias exports remain in dashboard/sales servers.

Implementation log:

- Implemented `apps/web/src/features/operations/date-bounds.ts` with `getOperationalDateBounds`.
- Added `apps/web/src/features/operations/date-bounds.test.ts` covering empty data, sales-only, stock-only, mixed data, and analytics cache profile.
- Replaced duplicated dashboard and sales date-bound implementations with aliases to `getOperationalDateBounds`.
- Fixed the new date-bounds test harness after root-cause tracing showed `withTenantContext` calls `tx.execute` before invoking the callback.

### PR-10 - Onboarding Bootstrap Module Split

Status: Implemented.

Purpose:

- Move initial organization/bootstrap behavior out of broad `app-session` module into an onboarding/organization bootstrap module.

Files:

- Create: `apps/web/src/features/onboarding/server.ts` or `apps/web/src/features/organization/bootstrap.ts`
- Modify: `apps/web/src/lib/app-session.ts`
- Modify: `apps/web/src/features/onboarding/actions.ts`
- Move/update tests from `apps/web/src/lib/app-session.test.ts`
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Identify exact bootstrap functions and tests in `app-session`.
- [x] Move implementation without changing advisory lock/user context/tenant context behavior.
- [x] Leave session/context helpers in `app-session`.
- [x] Add source guard if practical.
- [x] Run app-session and onboarding tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/lib/app-session.test.ts src/features/onboarding/actions.test.ts src/features/onboarding/server.test.ts`
- Result: passed, 3 test files, 16 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/lib/app-session.ts,apps/web/src/features/onboarding/actions.ts,apps/web/src/features/onboarding/server.ts -Pattern 'createInitialOrganizationForUser|ONBOARDING_LOCK_NAMESPACE|billingPlans|billingCustomers|systemSettings|OTHERS_CATEGORY_KEY'`
- Result: bootstrap symbols appear only in onboarding action/server, not in `app-session.ts`.

Implementation log:

- Created `apps/web/src/features/onboarding/server.ts` and moved `createInitialOrganizationForUser` plus onboarding constants/defaults into it.
- Updated `apps/web/src/features/onboarding/actions.ts` to import bootstrap behavior from the onboarding module while continuing to use `getAppContext` from `app-session`.
- Moved bootstrap tests into `apps/web/src/features/onboarding/server.test.ts`, preserving advisory lock ordering, user context ordering, technical tenant identity, E2E billing activation, and missing-plan behavior.
- Kept `apps/web/src/lib/app-session.ts` focused on session, membership, billing status, permission, and page redirect context helpers.
- Added/updated the source guard in `apps/web/src/lib/app-session.test.ts` so bootstrap implementation and export do not return to `app-session`.
- Verification emitted a Postgres SSL-mode deprecation warning from dependencies; no test failed.

### PR-11 - UI Package Interface and Dependency Honesty

Status: Implemented.

Purpose:

- Make `@polaris/ui`'s real interface and dependencies explicit.

Files:

- Modify: `packages/ui/package.json`
- Modify: `packages/ui/src/components/shared/base-sidebar.tsx` only if needed for type tightening.
- Test or source guard: `apps/web/src/lib/package-boundary.test.ts` or new package manifest test.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Decide whether to formalize exports or document internal source-sharing based on current imports.
- [x] Add missing package dependencies/peer dependencies for actual imports.
- [x] Add a guard that prevents silent manifest/source mismatch.
- [x] Run package boundary and typecheck tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd packages/ui vitest run src/package-interface.test.ts src/components/ui/chart.test.ts`
- Result: passed, 2 test files, 4 tests.
- Command: `bun --cwd packages/ui tsc --noEmit --project tsconfig.json`
- Result: passed.
- Command: `bun --cwd apps/web vitest run src/lib/package-boundary.test.ts`
- Result: passed, 1 test file, 3 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `bun --cwd apps/admin typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.

Implementation log:

- Formalized `@polaris/ui` public exports with patterns for shared components, UI components, SVG components, hooks, libs, and CSS while keeping existing concrete exports.
- Added `packages/ui/src/package-interface.test.ts` to guard both exported entry-point patterns and package manifest honesty for bare runtime imports.
- Fixed `packages/ui/src/components/ui/date-range-picker.tsx` so it no longer imports app-domain date helpers through the package-local `@/` alias.
- Added explicit UI package dev dependencies for test/type support and updated `packages/ui/tsconfig.json` for TypeScript 6 deprecation handling plus Node test types.
- Added `packages/ui/vitest.config.ts` so package-local tests resolve the UI package's `@/` alias without relying on app-level config.
- Changed the chart test import to use package-local resolution and verified it with the package Vitest config.
- Ran `bun install`; lockfile stayed consistent with no dependency downloads needed beyond workspace resolution.

### PR-12 - Screen Page-Load Modules

Status: Implemented.

Purpose:

- Move major screen data composition out of App Router page files where it creates real depth, not pass-through wrappers.

Files:

- Create/modify page-load modules under `apps/web/src/features/*`.
- Modify product, sales and dashboard page files.
- Add loader tests.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Start with the noisiest page only; do not refactor all screens at once if one screen proves the pattern.
- [x] Loader owns params and DTO assembly.
- [x] Page remains App Router adapter.
- [x] Run page/loader tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/features/products/detail-page.test.ts`
- Result: passed, 1 test file, 2 tests.
- Command: `bun --cwd apps/web vitest run src/features/sales/list-page.test.ts src/features/sales/date-range.test.ts src/features/sales/queries.test.ts src/features/sales/server.test.ts`
- Result: passed, 4 test files, 10 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -LiteralPath 'apps/web/src/app/(app)/produtos/[id]/page.tsx' -Pattern 'getProductByIdQuery|getProductStockEntriesByProductIdQuery|buildProductInventorySummary|requirePageAppContext|loadProductDetailPage'`
- Result: only `loadProductDetailPage` import/call remains.
- Command: `Select-String -Path 'apps/web/src/app/(app)/vendas/(list)/page.tsx' -Pattern 'getSalesQuery|getSalesAnalytics|getCatalogSettings|getSalesDateBounds|resolveSalesDateRange|requirePageAppContext|loadSalesListPage'`
- Result: only `loadSalesListPage` import/call remains.

Implementation log:

- Created `apps/web/src/features/products/detail-page.ts` with `loadProductDetailPage`.
- Moved product detail context resolution, product fetch, parallel related-data loading, initial-stock-entry detection, and inventory summary DTO assembly out of the App Router page.
- Reduced `apps/web/src/app/(app)/produtos/[id]/page.tsx` to parameter extraction, `notFound` handling, and rendering from loader DTO.
- Added `apps/web/src/features/products/detail-page.test.ts` covering missing-product behavior and inventory summary DTO assembly.
- Added `apps/web/src/features/sales/list-page.ts` with `loadSalesListPage` for search param normalization, date range resolution, sales query, analytics, catalog settings, and `SalesPanel` DTO assembly.
- Reduced `apps/web/src/app/(app)/vendas/(list)/page.tsx` to App Router search-param handoff and rendering from loader DTO.
- Added `apps/web/src/features/sales/list-page.test.ts` covering the sales list loader contract and unsupported filter normalization.
- Deliberately limited this PR to high-noise screens where loaders own meaningful composition rather than creating pass-through wrappers.

### PR-13 - App-Local Paginated List State

Status: Implemented.

Purpose:

- Deduplicate product/sales load-more and filter state without moving domain behavior into generic UI.

Files:

- Create app-local hook/module under `apps/web/src/components` or `apps/web/src/features`.
- Modify `apps/web/src/components/products/products-panel.tsx`
- Modify `apps/web/src/components/sales/sales-panel.tsx`
- Update panel tests.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Write tests around merge/reset/failure behavior.
- [x] Extract only behavior common to both panels.
- [x] Keep rendering domain-specific.
- [x] Run panel tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/components/paginated-list-state.test.tsx src/components/products/products-panel.test.ts src/components/sales/sales-panel.test.ts`
- Result: passed, 3 test files, 9 tests.
- Command: `bun --cwd apps/web vitest run src/components/products/products-panel.test.ts`
- Result: passed, 1 test file, 2 tests.
- Command: `bun --cwd apps/web vitest run src/components/sales/sales-panel.test.ts`
- Result: passed, 1 test file, 2 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/components/products/products-panel.tsx,apps/web/src/components/sales/sales-panel.tsx -Pattern 'usePaginatedListState|useRef|cursorRef|setLoadingMore|loadMoreProductsAction|loadMoreSalesAction'`
- Result: both panels use `usePaginatedListState`; old local cursor/loading refs are gone.

Implementation log:

- Created `apps/web/src/components/paginated-list-state.ts` with `usePaginatedListState` for common item merge, reset, cursor, loading, load-more and error behavior.
- Added `apps/web/src/components/paginated-list-state.test.tsx` covering merge/update, reset-key replacement, unique load-more append/cursor advance, overlapping load prevention, and load-more failure release behavior.
- Updated products and sales panels to use the hook while keeping search/filter URL behavior and all rendering/domain labels in the panels.
- Updated `apps/web/vitest.config.ts` so app-local `*.test.tsx` component tests are included in the default web test run.
- Existing products and sales panel tests still cover pagination failure feedback and accessibility labels.

### PR-14 - Product Pricing Field Module

Status: Implemented.

Purpose:

- Centralize product price/markup suggestion behavior in product UI/domain module.

Files:

- Create: `apps/web/src/components/products/product-pricing-fields.tsx` or calculation helper under `features/products`.
- Modify: `apps/web/src/components/products/product-edit-fields.tsx`
- Modify: `apps/web/src/components/products/register-product-dialog.tsx`
- Add/update tests.
- Update: `docs/superpowers/plans/2026-07-13-architecture-deepening-pr-checklist.md`

Implementation checklist:

- [x] Extract calculation separately if form bindings differ.
- [x] Keep create/edit UI copy consistent.
- [x] Run product component tests.
- [x] Update this PR status and implementation log.

Verification:

- Command: `bun --cwd apps/web vitest run src/components/products/product-pricing-fields.test.tsx src/components/products/product-detail-actions.test.ts src/components/products/products-panel.test.ts`
- Result: passed, 3 test files, 6 tests.
- Command: `bun --cwd apps/web typecheck`
- Result: passed, `tsc --noEmit --project tsconfig.json`.
- Command: `Select-String -Path apps/web/src/components/products/product-edit-fields.tsx,apps/web/src/components/products/register-product-dialog.tsx -Pattern 'calculateSuggestedPrices|currentMarkupPercent|isBelowMinimum|minimumPrice|idealPrice' -CaseSensitive:$false`
- Result: no matches; price suggestion and markup logic now lives outside the create/edit form files.

Implementation log:

- Implemented `apps/web/src/components/products/product-pricing-fields.tsx` with shared product pricing state, suggested-price guide, and margin indicator.
- Updated `apps/web/src/components/products/product-edit-fields.tsx` and `apps/web/src/components/products/register-product-dialog.tsx` to consume the shared pricing UI instead of duplicating suggestion and markup behavior.
- Added `apps/web/src/components/products/product-pricing-fields.test.tsx` to cover suggested minimum/ideal prices, below-minimum feedback, selection callback, and margin display.
- Verification passed with the focused product component tests, web typecheck, and source search proving duplicate price/markup logic no longer remains in the create/edit form files.

## Excluded Suggestions

### DB injection into auth/platform-auth factories

Excluded because current evidence shows test ergonomics friction, not enough runtime or architecture payoff for this batch. Revisit if a later PR already touches those factories or if module mocking blocks a real test.

### Shared app shell frame

Excluded from this PR train because it depends on the `@polaris/ui` interface decision. Revisit after PR-11 if layout drift remains.

### Broad `@polaris/domain` extraction

Excluded because no reviewed seam justifies a broad domain package now. The plan keeps modules local and named by actual concepts.

### Generic repository interfaces for SQL

Excluded because most query paths have one real adapter. Internal parsing helpers are retained; public repository seams are not.

## Update Protocol After Each PR

After implementing each PR:

1. Change `Status: Planned` to `Status: Implemented` for that PR.
2. Check every implementation checklist item that was completed.
3. Add an implementation log entry with:
   - date
   - files changed
   - verification commands run
   - decisive result
   - residual risk
4. If a PR is intentionally skipped, change status to `Skipped` and explain why under implementation log.
5. Do not start the next PR until this document reflects the previous PR's final state.
