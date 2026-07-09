# Production Database Cleanup Runbook

## Purpose

Use this runbook only for an approved cleanup of known test/bootstrap data in a production-like Neon branch. Prefer recreating disposable E2E/preview branches instead of cleaning shared data in place.

This runbook is intentionally conservative: the companion SQL defaults to `rollback`, requires manual inspection, and is scoped to known Polaris test markers.

## Stop Conditions

Do not run cleanup when any item is unresolved:

- No written approval for the exact branch/database.
- No recent backup, PITR window or restore point confirmed in Neon.
- `DATABASE_URL_DIRECT` is not pointing to the intended branch.
- Runtime traffic is still writing the records targeted by cleanup.
- The dry-run counts include real customer records.
- The SQL has not been reviewed against the current schema.

## Required Evidence Before Commit

Record these in the release note or incident ticket:

- Neon project and branch name.
- Timestamp/PITR marker before cleanup.
- Operator name.
- Exact Git SHA containing this runbook and SQL.
- Dry-run row counts from every `cleanup_candidates` section.
- Post-cleanup validation output.

## Execution

1. Pull the production migration URL into the shell without printing it:

```bash
vercel env pull .env.production.local
```

2. Confirm the URL target manually in Neon Console. `DATABASE_URL_DIRECT` must be the migration/admin role for the intended branch, never the runtime app role.

3. Run the SQL in a transaction and keep the default `rollback` first:

```bash
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -f docs/production-database-cleanup.sql
```

4. Review the candidate counts and deleted-row counts.

5. If the result is correct, edit only the final transaction control line in a local copy from `rollback;` to `commit;`, then rerun that reviewed copy.

6. Run validation:

```bash
bun run db:smoke:rls
bun run prod:preflight
```

7. Check app health and logs after cleanup:

```bash
DEPLOYMENT_SMOKE_URL=https://SEU_DOMINIO bun run deploy:smoke
```

## What The SQL Targets

The script targets only records matching known internal/test markers:

- emails under `dgimports.local`;
- names prefixed with `E2E`, `Produto E2E`, `Produto Preco`, `Produto Cartao`, `Categoria E2E`;
- organizations with internal/test markers.

It also keeps the two operational email patterns documented inside the SQL. Review and adapt those patterns before any committed run.

## Rollback

Preferred rollback is Neon PITR to the timestamp recorded before cleanup.

If cleanup was committed and PITR is not acceptable, restore from export or write a compensating migration only after comparing the affected tables and audit logs. Do not guess missing customer data.
