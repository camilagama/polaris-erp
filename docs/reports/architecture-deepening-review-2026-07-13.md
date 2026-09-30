---
status: historical
snapshot_date: 2026-07-13
---

# Architecture deepening review - 2026-07-13

> **Historical snapshot — 2026-07-13.** Findings and assigned PRs describe the reviewed checkout, not current architecture or remaining work. Check current architecture docs and code before acting; use [P43](../operations/production-readiness.md) for operational evidence.

Status: read-only architecture review.

Scope: full Polaris monorepo: `apps/web`, `apps/admin`, `packages/*`, `scripts`, CI/ops docs and guardrails.

Constraint applied: the requested `improve-codebase-architecture` skill normally asks for a visual HTML report and opening it locally. Project instructions forbid visual support/opening local URLs, so this review is delivered as Markdown instead.

## Executive result

The codebase has moved in the right direction: `@polaris/db`, `@polaris/events`, `@polaris/platform`, `@polaris/platform-auth`, `@polaris/auth`, `@polaris/billing` and `@polaris/ui` already create useful seams. The strongest remaining architecture friction is not "missing packages"; it is that several new modules still expose too much implementation knowledge to their callers.

Top recommendation: deepen the platform outbox/admin events module first.

Reason: `apps/admin` can retry operational outbox rows by importing `@polaris/db` and `@polaris/events` directly. That action bypasses the platform module and does not record `platform_audit_events`, unlike platform billing and organization mutations. This is both an architecture issue and an operational audit risk.

## Review method

Inputs used:

- `aidd_docs/memory/project-state.md`
- `git log --oneline -n 60 --name-only`
- targeted source inspection with `Get-Content`, `Get-ChildItem`, `git grep`, `Select-String`
- subagent scans for `apps/web`, shared packages, admin/ops and UI

No tests were run because no code changed. Worktree was clean before the report.

## Candidate 1 - Deepen platform outbox/admin events

Recommendation strength: Strong.

Files:

- `apps/admin/src/app/events/actions.ts`
- `apps/admin/src/app/events/page.tsx`
- `packages/events/src/index.ts`
- `packages/platform/src/platform-admin.ts`
- `packages/platform/src/platform-billing.ts`
- `packages/platform/src/platform-organization-mutations.ts`

Current module shape:

- `@polaris/events` is a real module for webhook capture, outbox claims, status transitions and retry primitives.
- `@polaris/platform` is the intended module for platform admin queries and mutations.
- `apps/admin/src/app/events/actions.ts` crosses both seams directly by importing `db` and calling `retryOutboxEvent(db, eventId)`.

Problem:

The admin action has to know:

- which concrete database adapter to pass
- that retry means setting `event_outbox.status = 'pending'`
- that outbox retry lives in `@polaris/events`
- that no platform audit event is recorded

That makes the action's interface shallow. The action does not get much leverage from `@polaris/platform`; it still owns operational behavior. The deletion test is decisive: deleting the action-level `db` call does not remove complexity; the complexity must reappear somewhere else unless the platform module absorbs it.

Solution:

Create a platform module operation, for example:

- `retryPlatformOutboxEvent(input, mutationDb?)`

Where `input` includes:

- `actorPlatformAdminId`
- `actorUserId`
- `eventId`

Implementation:

- run in one transaction when possible
- retry the outbox row only if retryable
- record `platform_audit_events` with action like `outbox.retry_requested`
- return a small result such as `{ retried: boolean }`

Then update `apps/admin/src/app/events/actions.ts` to depend only on `@polaris/platform/events` or equivalent.

Benefits:

- Locality: retry policy and audit behavior sit in one module.
- Leverage: future admin surfaces get audited retry without knowing event table details.
- Testability: package-level tests can prove status transition plus audit in one seam.
- Guardrail opportunity: block runtime `@polaris/db` imports in `apps/admin/src/app/**`, with explicit exceptions only for dev bootstrap routes if still needed.

Risks:

- If `@polaris/events.retryOutboxEvent` remains SQL-only, the platform module must either compose it carefully or own a transaction-specific variant.
- Existing tests likely mock `@polaris/events`; they should move toward platform package tests.

Suggested tests:

- retry failed row records platform audit.
- retry dead_letter row records platform audit.
- retry processed/pending row returns no-op or domain error, by chosen policy.
- source guard: admin app pages/actions do not import `@polaris/db` or `@polaris/events` directly outside allowed routes.

## Candidate 2 - Formalize the webhook intake module

Recommendation strength: Strong.

Files:

- `apps/web/src/integrations/asaas/webhook.ts`
- `apps/web/src/integrations/woovi/webhook.ts`
- `apps/web/src/integrations/resend/webhook.ts`
- `packages/events/src/index.ts`
- `apps/web/src/lib/inngest-functions.ts`

Current module shape:

Each provider handler owns most of the same workflow:

- check provider configuration
- authenticate token/signature
- enforce request size
- parse body
- derive event id/correlation id
- redact payload
- `captureWebhookEvent`
- `enqueueOutboxEvent`
- run provider-specific reconciliation/recording
- update webhook status or return provider error

Problem:

Provider modules have too much interface. A new provider must learn outbox semantics, webhook capture semantics, status updates and provider verification. The repeated sequence is not just boilerplate; it encodes operational invariants. This lowers locality: changing capture-only policy or webhook status handling touches multiple providers.

The codebase already treats capture-only topics as a deliberate policy in `apps/web/src/lib/inngest-functions.ts`, but that policy is split from the provider handlers that enqueue `status: "observed"`.

Solution:

Introduce a webhook intake module, probably app-local at first:

- `apps/web/src/integrations/webhooks/intake.ts`

Shape:

- provider adapter verifies/parses/redacts and returns a normalized event:
  - `provider`
  - `providerEventId`
  - `correlationId`
  - `eventType`
  - `redactedPayload`
  - `rawPayload`
- intake module performs capture, outbox enqueue and status transition.
- provider adapter handles only provider-specific authentication and reconciliation.

Avoid a generic external seam until there are at least two real adapters with the same behavior. Here there are three, so the seam is real.

Benefits:

- Locality: outbox/capture semantics live in one implementation.
- Leverage: every provider gets consistent redaction/capture/idempotency behavior.
- Testability: one set of contract tests for intake; small provider tests for parse/verify only.

Risks:

- Do not hide provider-specific security checks behind a vague interface. Signature verification must remain explicit and testable.
- Avoid converting provider payloads to a lowest-common-denominator type that loses important reconciliation fields.

Suggested tests:

- valid provider event captures webhook and enqueues observed outbox row.
- capture succeeds but reconciliation fails updates webhook row as failed/manual review.
- invalid signature/token never captures or enqueues.
- request too large never reads/parses provider body.

## Candidate 3 - Move cache invalidation behind domain events

Recommendation strength: Strong.

Files:

- `apps/web/src/features/products/actions.ts`
- `apps/web/src/features/sales/actions.ts`
- `apps/web/src/features/catalog/actions.ts`
- `apps/web/src/lib/cache-tags.ts`

Current module shape:

The cache tag module names tags, but individual server actions know paths and tag impact:

- product mutations invalidate catalog and/or analytics
- sale mutations invalidate sales, products and analytics
- catalog mutations update catalog tags

Problem:

Actions own business-impact knowledge. This is a shallow interface: callers must know the mutation's read-model blast radius. The deletion test is clear: deleting helper functions in each action does not remove complexity; it reappears in every mutation.

Solution:

Create a module with event-named invalidation:

- `invalidateProductCreated`
- `invalidateProductUpdated`
- `invalidateProductStockChanged`
- `invalidateSaleCreated`
- `invalidateSaleCancelled`
- `invalidateCatalogSettingsChanged`

Or a single function:

- `invalidateDomainMutation({ organizationId, type, subjectId })`

Use the event names already present in audit events where practical.

Benefits:

- Locality: route/tag knowledge changes in one place.
- Leverage: future mutations do not need to rediscover analytics dependencies.
- Testability: verify each mutation event maps to paths/tags.

Risks:

- A too-generic event map can become a second router. Keep names close to actual domain mutations.
- Avoid hiding `revalidatePath` failures if Next changes semantics.

Suggested tests:

- product image replace invalidates catalog and detail.
- stock write-off invalidates analytics and product detail.
- sale cancellation invalidates sales, product list/detail and analytics.
- failed transaction does not invalidate.

## Candidate 4 - Deepen product write module by moving category validation into the transaction

Recommendation strength: Strong.

Files:

- `apps/web/src/features/products/actions.ts`
- `apps/web/src/features/products/server.ts`
- `packages/db/src/schema.ts`

Current module shape:

Product server functions own tenant-scoped writes and audit events. The action still checks whether the category exists before calling product writes.

Problem:

The product module's interface requires the caller to know that `categoryId` must be validated against the tenant before write. The database has a composite FK, but the friendly domain error is split from the transaction. There is a race window where the category can be deleted between validation and write; integrity remains protected, but locality of the domain error is weak.

Solution:

Move category existence/tenant validation into `createProductWithInitialStock` and `updateProductWithPriceHistory`, inside the same `withTenantContext` transaction.

Benefits:

- Locality: product write invariants sit with product write implementation.
- Leverage: future callers do not repeat category checks.
- Testability: product server tests prove category behavior without involving server actions.

Risks:

- Preserve friendly error messages.
- Preserve current source guard that actions do not import db/schema.

Suggested tests:

- create with missing category returns `Selecione uma categoria valida.`
- update with category from another tenant returns same stable domain error.
- category deletion race maps DB/FK failure to stable domain error.

## Candidate 5 - Move sale idempotency fully behind the sale module

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/features/sales/actions.ts`
- `apps/web/src/features/sales/server.ts`
- `packages/db/src/schema.ts`

Current module shape:

The sale action knows:

- unique constraint name
- pre-flight idempotency lookup
- conflict detection through nested error causes
- retry lookup after unique conflict

The sale server module owns the transaction but not the full "create once" interface.

Problem:

The sale module is deep for stock locking and financial calculations, but shallow for idempotency. The caller must know SQL constraint details to get safe retry semantics.

Solution:

Add `createSaleOnce`, probably in `features/sales/server.ts`, that owns:

- lookup by idempotency key
- create transaction
- unique conflict recovery
- return existing id on duplicate

The action should parse/auth/load catalog settings, call `createSaleOnce`, then invalidate.

Benefits:

- Locality: concurrency policy sits with sale creation.
- Leverage: future callers cannot accidentally bypass idempotency.
- Testability: concurrency tests target sale module interface.

Risks:

- Catalog settings are still external. Decide whether `createSaleOnce` receives rules or loads settings itself. Loading inside gives more depth but more coupling.

Suggested tests:

- duplicate idempotency key returns existing sale.
- unique conflict followed by lookup returns winner.
- unique conflict without found sale rethrows.
- non-idempotent create remains supported.

## Candidate 6 - Extract operational date bounds

Recommendation strength: Strong.

Files:

- `apps/web/src/features/dashboard/server.ts`
- `apps/web/src/features/sales/server.ts`

Current module shape:

Dashboard and sales both calculate date bounds from earliest sale and stock entry, with fallback to today.

Problem:

This is duplicated domain read logic. The deletion test: deleting either copy requires rebuilding the same query in the other place.

Solution:

Create `getOperationalDateBounds(organizationId)` in a neutral read module, likely under `features/dashboard` only if dashboard is the product concept, or `features/operations/date-bounds` if shared semantics matter.

Benefits:

- Locality for date-range rules.
- One cache/tag decision.
- Reduced divergence risk in analytics.

Risks:

- Avoid creating a vague `shared` folder. Name the module by concept: operational date bounds.

Suggested tests:

- empty sales and stock => today/today.
- only sales => first sale/today.
- only stock => first stock/today.
- both => earliest movement/today.

## Candidate 7 - Split session/context from onboarding bootstrap

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/features/onboarding/actions.ts`
- `apps/web/src/lib/app-session.ts`

Current module shape:

`lib/app-session` owns session helpers, permissions, billing access and initial organization/bootstrap behavior. Onboarding action mostly delegates to it.

Problem:

The implementation of initial tenant bootstrap is reasonably deep, but it lives in a broad module. That lowers AI-navigability: "app session" now means both request context and onboarding domain bootstrap.

Solution:

Move bootstrap into a named module:

- `features/onboarding/server.ts`
- or `features/organization/bootstrap.ts`

Keep `app-session` focused on session/context adapter responsibilities.

Benefits:

- Locality by domain concept.
- Easier testing and future evolution of onboarding.
- Better module names for future readers.

Risks:

- Preserve advisory lock, user context, tenant context, default catalog/settings, billing and audit behavior exactly.

Suggested tests:

- existing app-session tests should move or stay as contract tests.
- source guard preventing onboarding bootstrap from returning to `lib/app-session`.

## Candidate 8 - Make `@polaris/platform` a deeper module, not a folder of page queries

Recommendation strength: Strong.

Files:

- `packages/platform/src/platform-directory.ts`
- `packages/platform/src/platform-dashboard.ts`
- `packages/platform/src/platform-billing.ts`
- `packages/platform/src/platform-audit-events.ts`
- `packages/platform/src/platform-support-notes.ts`

Current module shape:

`@polaris/platform` provides useful seams, but internally repeats:

- `toRows`
- `toNumber`
- `toIsoString`
- string coercion
- default `db` adapters
- queryable/transactional DB shapes

Problem:

The package interface is growing by admin page, while implementation details repeat. This is a signal that the external seam is useful but the internal modules are shallow. The package has leverage, but not enough locality.

Solution:

Introduce internal modules only, not new public seams:

- result parsing helpers for raw SQL rows
- platform DB adapter helpers
- audit mutation helper
- possibly `platformProfile` for admin layout needs

Keep the external interface stable.

Benefits:

- Reduces conversion drift.
- Improves package testability.
- Lets admin app depend on platform intent instead of db details.

Risks:

- Do not expose a generic "repository" interface unless there are two real adapters.
- Keep SQL close to the query concept; centralize parsing, not every query.

Suggested tests:

- parser behavior for bigint, Date, string dates and nulls.
- dashboard health uses injected queryable DB, not global DB.
- admin layout can fetch profile through platform module.

## Candidate 9 - Inject DB into auth/platform-auth factories

Recommendation strength: Worth exploring.

Files:

- `packages/auth/src/auth.ts`
- `packages/platform-auth/src/admin-guard.ts`
- `packages/db/src/index.ts`

Current module shape:

`createPolarisAuth` injects login audit hook but fixes `drizzleAdapter(db)`. `createPlatformAdminAuth` injects session access but fixes `db`.

Problem:

The factories look injectable but are still coupled to the singleton DB adapter. Tests rely on module mocking, not a real adapter seam. The interface is therefore shallower than it appears.

Solution:

Allow optional DB dependencies:

- `createPolarisAuth({ db, recordAuthLoginAuditEvent })`
- `createPlatformAdminAuth({ getSession, db })`

Use singleton defaults for app runtime.

Benefits:

- Local fakes in tests.
- Less module mocking.
- Cleaner adapter seam for future runtime tests.

Risks:

- Better Auth adapter types may make this noisier than useful; evaluate before patching.

Suggested tests:

- auth factory uses provided db.
- platform admin auth can resolve grants using fake db without `vi.mock("@polaris/db")`.

## Candidate 10 - Fix `@polaris/ui` public interface mismatch

Recommendation strength: Strong.

Files:

- `packages/ui/package.json`
- `packages/ui/src/components/shared/base-sidebar.tsx`
- `packages/ui/src/components/ui/sidebar.tsx`
- `apps/web/tsconfig.json`
- `apps/admin/tsconfig.json`

Current module shape:

`packages/ui/package.json` exports a small surface, but apps import package internals through TypeScript paths. The real seam is the source tree, not the package manifest.

Problem:

The package has a false interface. Renaming a primitive can break apps even if the package's declared exports appear unchanged. Also, `packages/ui` uses `next` and Hugeicons but does not declare those dependencies in its manifest.

Solution options:

1. Formalize exports for every primitive that apps are allowed to use.
2. Treat `packages/ui` as internal source-sharing and document/guard that explicitly.
3. Split Next-specific shell/sidebar from UI primitives.

Benefits:

- Clear seam for UI package.
- Better dependency locality.
- Safer refactors of primitives.

Risks:

- Exporting every shadcn primitive can make the public interface wide. If this is workspace-internal only, a documented internal seam may be more honest.

Suggested tests:

- package boundary test ensures apps import only declared exports, if choosing option 1.
- package manifest dependency test for imports used by `packages/ui`.

## Candidate 11 - Shared app shell frame for web/admin

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/app/(app)/layout.tsx`
- `apps/admin/src/app/layout.tsx`
- `packages/ui/src/components/shared/base-sidebar.tsx`

Current module shape:

Both web and admin layouts assemble a sidebar provider, sidebar, inset, sticky header, trigger and content padding. The sidebars differ, but the frame is similar.

Problem:

The shell frame has two adapters already: web and admin. That makes the seam real. Changing frame behavior likely requires editing both layouts.

Solution:

Create a shared frame module:

- `AppShellFrame`
- accepts sidebar node, title, subtitle and children

Keep auth/session logic outside the frame.

Benefits:

- Leverage across both apps.
- Better visual consistency.
- Reduced layout drift.

Risks:

- Do not move app-specific auth or metadata into the frame.

Suggested tests:

- simple render tests for frame structure.
- page/layout source tests remain focused on auth guard.

## Candidate 12 - Admin perimeter decision needs one source of truth

Recommendation strength: Strong.

Files:

- `aidd_docs/memory/project-state.md`
- `packages/platform-auth/src/admin-guard.ts`
- `apps/web/src/ops/ci-workflow.test.ts`
- `docs/superpowers/plans/2026-07-10-production-readiness-pr-plan.md`

Current module shape:

Project memory still says `@polaris/platform-auth` provides Cloudflare Access validation and that Cloudflare Access must protect admin surfaces. Current source appears to use Better Auth/session grants, while CI tests guard against reintroducing Cloudflare tokens.

Problem:

The admin perimeter seam is conceptually unstable. The code and docs point in different directions. Architecture reviews will keep re-suggesting the wrong thing until the decision is recorded.

Solution:

Pick the perimeter adapter:

- Vercel Authentication / Better Auth + DB grants, or
- Cloudflare Access + DB grants

Then update memory/docs and guardrails to match.

Benefits:

- Production certification has one target.
- Future agents do not reopen settled architecture.
- Better operational locality.

Risks:

- This may require external infrastructure evidence, not just code.

Suggested tests:

- CI/preflight checks assert the selected perimeter evidence.
- source guard prevents the rejected perimeter from drifting back into active source if that is the decision.

## Candidate 13 - Fix admin E2E CI guard

Recommendation strength: Strong.

Files:

- `.github/workflows/ci.yml`
- `apps/web/src/ops/ci-workflow.test.ts`

Current module shape:

The admin E2E workflow uses `secrets.ADMIN_E2E_DATABASE_URL`. The source test appears to assert `secrets.E2E_DATABASE_URL`, which is already used by web E2E.

Problem:

The guard can pass even if the admin job loses its isolated database secret. This is not a deep-module refactor, but it is a high-value correctness issue found during architecture review.

Solution:

Update the CI workflow test to assert `ADMIN_E2E_DATABASE_URL` in the admin E2E job specifically.

Benefits:

- Production gate is less brittle.
- Admin isolation guarantee becomes test-backed.

Risks:

- Low.

Suggested tests:

- narrow: `bun test apps/web/src/ops/ci-workflow.test.ts`

## Candidate 14 - Page-load modules for major web screens

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/app/(app)/produtos/(catalog)/page.tsx`
- `apps/web/src/app/(app)/vendas/(list)/page.tsx`
- `apps/web/src/app/(app)/_components/dashboard-content.tsx`

Current module shape:

Pages compose search params, app context, settings, queries, analytics and UI props.

Problem:

The App Router page is acting as an adapter and a read-model composer. That widens the interface of page tests and lowers locality for screen-level data contracts.

Solution:

Create page-load modules by screen:

- `loadProductsCatalogPage`
- `loadSalesPage`
- `loadDashboardPage`

These should not be pass-through wrappers. They should own parsing and screen DTO assembly.

Benefits:

- Pages become thin adapters.
- Tests can target screen data contracts.
- Easier AI navigation.

Risks:

- Avoid extracting each individual query call into a wrapper. The module earns depth only if it owns meaningful screen composition.

Suggested tests:

- search params map to loader input.
- loader returns stable DTO for empty/filtered states.

## Candidate 15 - Product list and sales list state module

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/components/products/products-panel.tsx`
- `apps/web/src/components/sales/sales-panel.tsx`

Current module shape:

Both panels maintain cursor state, local page merging, URL filters, load-more behavior and empty state logic.

Problem:

This is a repeated UI behavior module, but it is app-domain behavior, not generic UI. Extracting it to `packages/ui` would likely be shallow. Keeping it app-local could deepen the list interaction seam.

Solution:

Create an app-local hook/module for paginated filtered list state, with domain adapters for product and sale item rendering.

Benefits:

- Locality for load-more bugs.
- Better testability of pagination/merge behavior.

Risks:

- Over-generalization can create an interface as complex as the two implementations.

Suggested tests:

- load more appends unique rows.
- filter change resets local pages.
- failed load more releases loading state and surfaces error.

## Candidate 16 - Product price/markup field module

Recommendation strength: Worth exploring.

Files:

- `apps/web/src/components/products/product-edit-fields.tsx`
- `apps/web/src/components/products/register-product-dialog.tsx`

Current module shape:

Price suggestion and markup presentation logic appears in both edit and register surfaces.

Problem:

The pricing invariant is UI-adjacent but domain-specific. It does not belong in generic UI primitives; it belongs in a product presentation module.

Solution:

Create `ProductPricingFields` or `MarkupGuide` under `components/products` or `features/products`.

Benefits:

- Locality for markup copy/math.
- Consistent price suggestions across create/edit.

Risks:

- Keep form-library coupling clear. If create and edit use different form control shapes, split calculation from rendering.

Suggested tests:

- suggestion calculation.
- display for zero/empty cost.
- edit/create render behavior stays consistent.

## Triage order

1. Admin outbox retry through `@polaris/platform` with audit.
2. Admin E2E CI guard fix.
3. Admin perimeter source-of-truth decision in memory/docs/guardrails.
4. Webhook intake module.
5. Cache invalidation module.
6. Product category validation inside product write module.
7. `@polaris/platform` internal row parsing/DB adapter cleanup.
8. `@polaris/ui` public interface/dependency cleanup.
9. Sale idempotency behind sale module.
10. Operational date bounds module.
11. App-session/onboarding split.
12. Page-load modules.
13. Shared shell frame.
14. Paginated list state.
15. Product price/markup field module.

## Non-recommendations

- Do not extract a broad `@polaris/domain` package yet. The review found several real seams, but most are still app/package-local. A broad package would likely become a shallow dumping ground.
- Do not introduce repository interfaces for every SQL query. One adapter is a hypothetical seam; use internal helpers first unless there are two concrete adapters.
- Do not move shadcn primitives into a deep abstraction. They are shallow by design. The problem is the package interface mismatch, not the primitive thinness.
- Do not turn the webhook intake module into a provider-agnostic lowest-common-denominator parser. Provider-specific security checks must stay explicit.

## Verification performed

Commands used during the review:

- `git status --short`
- `git log --oneline -n 60 --name-only`
- `Get-ChildItem`
- `Get-Content`
- `git grep`
- `Select-String`

Subagents used:

- `apps/web` domain/runtime review
- shared packages review
- `apps/admin`/ops/guardrails review
- UI/shared shell review

No tests were executed because this report is documentation-only.

