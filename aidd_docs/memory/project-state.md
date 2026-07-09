# Project State Memory

Last reviewed: 2026-07-09

## Current Architecture

- Polaris is a Bun/Turborepo monorepo with `apps/web`, `apps/admin`, `packages/config`, `packages/emails` and `packages/billing`.
- `apps/web` owns the customer app, Drizzle schema, migrations, RLS helpers, webhooks and operational scripts.
- `apps/admin` is the internal platform admin surface. It still uses a temporary TypeScript alias into `apps/web/src` for auth/DB/platform helpers.
- `@polaris/db`, `@polaris/auth`, `@polaris/ui`, `@polaris/domain` and `@polaris/events` are intentionally not extracted yet.

## Production Gates Still External

- Vercel projects/domains and preview protection need real environment validation.
- Cloudflare Access must protect `admin.*` and staging surfaces.
- Neon production branch protection, runtime role without `BYPASSRLS`, and migrations via `DATABASE_URL_DIRECT` still need live proof.
- Upstash, R2 lifecycle, Sentry alerts, OAuth callbacks, Resend domain, Inngest credentials, Woovi and Asaas sandbox/prod validation remain operational gates.

## Current Implementation Notes

- Admin mutations have dedicated rate limits through `assertAdminRateLimit`.
- The temporary admin-to-web boundary is guarded by a source test so new cross-app imports do not expand silently.
- Outbox foundation uses local DB tables plus Inngest route/function for durable claim/finalization.
- Resend, Woovi and Asaas webhooks enqueue outbox events and dispatch Inngest best-effort while preserving current synchronous effects.
- Full release is not proven until `prod:preflight`, `deploy:smoke`, RLS smoke, E2E and environment-specific checks pass against real promoted infrastructure.
