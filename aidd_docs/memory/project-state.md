# Project State Memory

Last reviewed: 2026-07-09

## Current Architecture

- Polaris is a Bun/Turborepo monorepo with `apps/web`, `apps/admin`, `packages/config`, `packages/db`, `packages/auth`, `packages/events`, `packages/platform`, `packages/platform-auth`, `packages/emails` and `packages/billing`.
- `apps/web` owns the customer app, RLS usage, webhooks and operational scripts.
- `apps/admin` is the internal platform admin surface. Its TypeScript alias is local-only (`@/*` -> `./src/*`); direct admin-to-web source imports are blocked by a source test.
- `@polaris/db` now owns the shared Drizzle schema/client/tenant context, Drizzle config and migration files. `apps/web/src/db/*` keeps short compatibility wrappers for existing web imports.
- `@polaris/events` now provides the shared outbox/webhook/idempotency helpers used by web and admin.
- `@polaris/platform` now provides shared platform admin queries, mutations, audit/support helpers and dashboard data.
- `@polaris/platform-auth` now provides Cloudflare Access validation, platform admin DB grants and admin rate limiting. `apps/admin/src/lib/platform-admin-auth.ts` is only a local session-injection wrapper.
- `@polaris/auth` now provides the shared Better Auth factory, auth env contract, session helpers and workspace management policy. The web app injects tenant login audit; the admin uses a local wrapper without importing from `apps/web`.
- `@polaris/ui` and `@polaris/domain` are intentionally not extracted yet.

## Production Gates Still External

- Vercel projects/domains and preview protection need real environment validation.
- Cloudflare Access must protect `admin.*` and staging surfaces.
- Neon production branch protection, runtime role without `BYPASSRLS`, and migrations via `DATABASE_URL_DIRECT` still need live proof.
- Upstash, R2 lifecycle, Sentry alerts, OAuth callbacks, Resend domain, Inngest credentials, Woovi and Asaas sandbox/prod validation remain operational gates.

## Current Implementation Notes

- Admin mutations have dedicated rate limits through `assertAdminRateLimit`.
- The admin-to-web boundary source test now has an empty allowlist for temporary web imports.
- Outbox foundation uses shared `@polaris/events` helpers, local DB tables plus Inngest route/function for durable claim/finalization.
- Resend, Woovi and Asaas webhooks enqueue outbox events and dispatch Inngest best-effort while preserving current synchronous effects.
- Full release is not proven until `prod:preflight`, `deploy:smoke`, RLS smoke, E2E and environment-specific checks pass against real promoted infrastructure.
