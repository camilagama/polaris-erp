# SaaS Organization Migration Runbook

## Scope

This runbook covers the SaaS foundation migration: Better Auth organization tables, tenant backfill, tenant-scoped cache/storage paths, self-serve registration, onboarding, single-user workspace membership, RBAC context, and distributed rate limit. Billing and multi-user workspace management are intentionally out of scope.

## Preflight

1. Confirm a fresh Neon branch exists for staging.
2. Confirm PITR/restore is enabled for the production database.
3. Confirm these commands pass locally before staging:
   - `bun run check`
   - `bun run test`
   - `bun run build`
4. Confirm required auth env vars are present:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
5. Configure `MAGIC_LINK_EMAIL_WEBHOOK_URL` before enabling magic-link sign-in in a shared environment.
6. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` before production traffic. Production rate limit fails closed without them.

## Staging Migration

1. Apply all pending migrations with `bun run db:migrate`, including:
   - `20260703225008_spotty_cardiac.sql`
   - `20260704013000_remove_viewer_role.sql`
2. Verify table counts and constraints:
   - `organization` has `org_dg_imports`.
   - `member` has one `owner` membership per existing user.
   - `member.role` contains only `owner`, `admin`, `operator`.
   - Domain tables have no null `organization_id`.
   - Composite tenant constraints exist for product/category, product histories and sale items.
   - Tenant indexes exist for product histories, sale items and goals.
3. Smoke test:
   - `/register` creates a user session and redirects new users to `/onboarding`.
   - Google login redirects to `/onboarding` only for users without membership.
   - Existing users land on `/`.
   - Onboarding asks only for organization name and creates organization, owner membership, category `Outros` and default catalog settings.
   - Product list, product detail, sales list, dashboard and settings load.
   - Product image URLs include `/api/product-images/{organizationId}/...`.
   - R2 reconcile scans `organizations/` keys and does not return raw object keys.
   - `audit_events` receives auth login, settings, product, stock, sale and image events.

## Production Deploy

1. Take a Neon restore point or record latest PITR timestamp.
2. Deploy app code.
3. Apply migrations.
4. Run smoke checks:
   - `/api/health`
   - `/register`
   - login
   - onboarding
   - dashboard
   - product upload
   - sale creation/cancel
   - image reconcile endpoint with cron secret
   - rate limit with Upstash configured

## Rollback

Preferred rollback is database restore/PITR to the recorded timestamp plus reverting the app deployment.

If only app rollback is needed, do not run older single-tenant code against the migrated database unless it has compatibility shims for `organization_id`.

## Incident Notes

For suspected cross-tenant exposure:

1. Disable public access at the edge.
2. Preserve logs and Sentry event IDs.
3. Query `audit_events` and affected domain tables by `organization_id`.
4. Restore from PITR if data integrity is in doubt.

## Known Hardening Follow-up

Row Level Security is not enabled yet. The application enforces tenant isolation through `organizationId` filters, composite FKs and route/action guards. RLS can be added later with a dedicated connection/session strategy so policies receive the active tenant without breaking serverless pooling.
