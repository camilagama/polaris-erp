---
execution_status: superseded
superseded_by:
  - ../../runbooks/production-migrations.md
  - ../../operations/production-readiness.md
  - ../../../plans/fundacao-polaris-erp.md
---

# RLS Tenant Isolation Implementation Plan

> **Não executar este roteiro antigo.** A sequência de migrations e validação foi substituída pelo [runbook P45](../../runbooks/production-migrations.md) e pela ordem atual no [plano de fundação](../../../plans/fundacao-polaris-erp.md). O gate de RLS/Production permanece pendente ou desconhecido conforme [P43](../../operations/production-readiness.md); este lifecycle não declara RLS de produção concluída.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PostgreSQL Row Level Security mandatory before production for all tenant-scoped Polaris data.

**Architecture:** Keep application-level `organizationId` filters, but add database-enforced RLS as the final isolation boundary. Runtime tenant access must run inside a transaction that sets `app.organization_id` with `set_config(..., true)`, then queries through that transaction object. RLS policies deny access when the tenant setting is missing or different from the row tenant.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, `pg`, PostgreSQL 18.4 on Neon, Vitest, Playwright, Ultracite.

## Global Constraints

- Do not apply schema changes to the parent Neon branch without explicit user approval.
- Do not commit unless the user explicitly asks.
- Use `DATABASE_URL_DIRECT` for migrations and branch validation; runtime app code continues to use `DATABASE_URL`.
- RLS migration must be validated in a temporary Neon branch before production.
- Better Auth base tables stay out of the first RLS cut: `users`, `sessions`, `accounts`, `verifications`.
- Tenant-scoped RLS applies to: `organization`, `member`, `invitation`, `audit_events`, `categories`, `system_settings`, `products`, `product_price_changes`, `product_stock_entries`, `product_stock_write_offs`, `sales`, `sale_items`, `goals`.
- Runtime tenant context must use transaction-local state, not session-global `SET`.

---

## File Structure

- Create `src/db/tenant-context.ts`: transaction-scoped tenant helper and shared `TenantTransaction` type.
- Create `src/db/tenant-context.test.ts`: unit tests for the helper contract.
- Create `src/db/rls-policy-sql.test.ts`: static test that the RLS migration enables, forces and defines policies for every tenant table.
- Create a timestamped SQL migration under `src/db/migrations/`: RLS policies and force RLS.
- Modify `src/features/*/{server,queries}.ts`, `src/features/products/image-access.ts`, and `src/lib/audit-log.ts`: execute tenant-scoped queries through the helper.
- Modify tests beside touched modules: assert tenant helper is used and no direct tenant DB path bypasses the wrapper.
- Update `docs/rls-tenant-isolation.md`, `docs/prs.md`, and `docs/Resumo executivo.md`.

---

### Task 1: Add Tenant Context Helper Tests

**Files:**
- Create: `src/db/tenant-context.test.ts`
- Create later in Task 2: `src/db/tenant-context.ts`

**Interfaces:**
- Consumes: existing `db.transaction` API from `src/db/index.ts`.
- Produces:
  - `type TenantTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]`
  - `withTenantContext<T>(organizationId: string, callback: (tx: TenantTransaction) => Promise<T>): Promise<T>`
  - `setTenantContext(tx: TenantTransaction, organizationId: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

```ts
import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { setTenantContext, withTenantContext } from "@/db/tenant-context";

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("tenant database context", () => {
  it("sets organization id transaction-locally before running tenant queries", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute };
    const { db } = await import("@/db");

    vi.mocked(db.transaction).mockImplementation(async (callback) =>
      callback(tx as never)
    );

    await withTenantContext("org_123", async (tenantTx) => {
      expect(tenantTx).toBe(tx);
      return "ok";
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(String(execute.mock.calls[0]?.[0])).toContain("set_config");
    expect(String(execute.mock.calls[0]?.[0])).toContain("app.organization_id");
  });

  it("uses transaction-local scope when setting tenant context directly", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    await setTenantContext({ execute } as never, "org_456");

    expect(execute).toHaveBeenCalledWith(
      sql`select set_config('app.organization_id', ${"org_456"}, true)`
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
bun run test -- src/db/tenant-context.test.ts
```

Expected: FAIL because `src/db/tenant-context.ts` does not exist yet.

---

### Task 2: Implement Tenant Context Helper

**Files:**
- Create: `src/db/tenant-context.ts`
- Test: `src/db/tenant-context.test.ts`

**Interfaces:**
- Produces the helper used by all later tasks.

- [ ] **Step 1: Implement the helper**

```ts
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type TenantTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export const setTenantContext = async (
  tx: TenantTransaction,
  organizationId: string
): Promise<void> => {
  await tx.execute(
    sql`select set_config('app.organization_id', ${organizationId}, true)`
  );
};

export const withTenantContext = async <T>(
  organizationId: string,
  callback: (tx: TenantTransaction) => Promise<T>
): Promise<T> =>
  db.transaction(async (tx) => {
    await setTenantContext(tx, organizationId);
    return callback(tx);
  });
```

- [ ] **Step 2: Run helper tests**

Run:

```bash
bun run test -- src/db/tenant-context.test.ts
```

Expected: PASS.

---

### Task 3: Route Tenant-Scoped DB Access Through the Helper

**Files:**
- Modify: `src/features/catalog/server.ts`
- Modify: `src/features/dashboard/server.ts`
- Modify: `src/features/goals/server.ts`
- Modify: `src/features/products/queries.ts`
- Modify: `src/features/products/server.ts`
- Modify: `src/features/products/image-access.ts`
- Modify: `src/features/sales/queries.ts`
- Modify: `src/features/sales/server.ts`
- Modify: `src/lib/audit-log.ts`
- Test: existing tests beside each module.

**Interfaces:**
- Consumes: `withTenantContext` and `TenantTransaction`.
- Produces: every tenant-scoped read/write executes after transaction-local tenant is set.

- [ ] **Step 1: Update one module at a time**

For each public function receiving `organizationId`, wrap the DB work:

```ts
import { withTenantContext } from "@/db/tenant-context";

export const getExampleData = async (organizationId: string) =>
  withTenantContext(organizationId, async (tx) =>
    tx
      .select()
      .from(exampleTable)
      .where(eq(exampleTable.organizationId, organizationId))
  );
```

For functions that already open `db.transaction`, replace the outer `db.transaction` with `withTenantContext` and use the `tx` provided by the helper.

- [ ] **Step 2: Keep auth/pre-tenant paths outside helper**

Do not wrap Better Auth login/session creation paths that do not yet have an active organization. Keep `src/lib/app-session.ts` onboarding logic explicit until the user has a tenant.

- [ ] **Step 3: Run focused tests after each module**

Run the relevant focused test after each module change, for example:

```bash
bun run test -- src/features/catalog/server.test.ts
bun run test -- src/features/products/actions.test.ts
bun run test -- src/features/sales/actions.test.ts
bun run test -- src/features/goals/server.test.ts
```

Expected: PASS after mocks are updated to include `tx.execute`.

---

### Task 4: Add Local RLS Migration and Static Proof

**Files:**
- Create: `src/db/migrations/<timestamp>_rls_tenant_isolation.sql`
- Create: `src/db/rls-policy-sql.test.ts`

**Interfaces:**
- Consumes: tenant setting `app.organization_id`.
- Produces: SQL migration that enables and forces RLS on every tenant-scoped table and creates deny-by-default tenant policies.

- [ ] **Step 1: Write static migration test first**

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const migrationsDir = join(projectRoot, "src/db/migrations");
const tenantTables = [
  "organization",
  "member",
  "invitation",
  "audit_events",
  "categories",
  "system_settings",
  "products",
  "product_price_changes",
  "product_stock_entries",
  "product_stock_write_offs",
  "sales",
  "sale_items",
  "goals",
];

const migrationSql = readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
  .join("\n");

describe("RLS tenant isolation migration", () => {
  it("enables and forces row level security on all tenant-scoped tables", () => {
    for (const table of tenantTables) {
      expect(migrationSql).toContain(
        `alter table public.${table} enable row level security`
      );
      expect(migrationSql).toContain(
        `alter table public.${table} force row level security`
      );
    }
  });

  it("uses transaction-local organization id as the policy source", () => {
    expect(migrationSql).toContain(
      "current_setting('app.organization_id', true)"
    );
  });
});
```

- [ ] **Step 2: Create the migration**

Use one policy per table:

```sql
alter table public.products enable row level security;
alter table public.products force row level security;

drop policy if exists products_tenant_isolation on public.products;
create policy products_tenant_isolation on public.products
  as restrictive
  for all
  using (organization_id = current_setting('app.organization_id', true))
  with check (organization_id = current_setting('app.organization_id', true));
```

For `organization`, use `id = current_setting('app.organization_id', true)`.

- [ ] **Step 3: Run the static migration test**

Run:

```bash
bun run test -- src/db/rls-policy-sql.test.ts
```

Expected: PASS.

---

### Task 5: Validate Against Neon Temporary Branch

**Files:**
- No source code changes unless validation reveals a migration issue.
- Update: `docs/rls-tenant-isolation.md`

**Interfaces:**
- Consumes: migration SQL from Task 4.
- Produces: evidence that RLS applies in a Neon branch before production.

- [ ] **Step 1: Locate the Neon project**

Use the Neon plugin search. Current evidence: searches for endpoint/name returned `[]`, so do not assume a project ID.

If a project ID is found, continue with plugin workflow. If not found, stop and report that plugin project discovery is unavailable even though direct database read access works.

- [ ] **Step 2: Prepare migration on temporary branch**

Use `prepare_database_migration` with the RLS migration SQL and database `neondb`.

Expected: tool returns migration ID, temporary branch name and temporary branch ID.

- [ ] **Step 3: Verify policies in temporary branch**

Use `run_sql` against the temporary branch:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Expected: every tenant-scoped table has a tenant isolation policy.

- [ ] **Step 4: Verify deny-by-default**

Use `run_sql` against the temporary branch:

```sql
begin;
reset app.organization_id;
select count(*) from public.products;
rollback;
```

Expected: zero visible rows or an RLS-related denial, depending on table privileges and role.

- [ ] **Step 5: Do not complete migration without approval**

Do not call `complete_database_migration` with `applyChanges: true` until the user approves applying the tested migration to the parent branch.

---

### Task 6: Full Verification and Docs

**Files:**
- Modify: `docs/rls-tenant-isolation.md`
- Modify: `docs/prs.md`
- Modify: `docs/Resumo executivo.md`

**Interfaces:**
- Consumes: implementation and Neon validation evidence.
- Produces: final audit trail.

- [ ] **Step 1: Run local gates**

Run:

```bash
bun run check
bun run test
bun run knip
bun run build
```

Expected:

- `check` passes.
- Vitest passes.
- `knip` passes with only the expected `E2E_DATABASE_URL` warning if no isolated E2E DB is configured.
- `build` passes.

- [ ] **Step 2: Update docs**

Record:

- RLS helper implemented.
- RLS migration created.
- Neon temporary branch validation result.
- Whether parent branch migration was applied or intentionally held.
- Remaining blocker: Playwright full E2E still requires `E2E_DATABASE_URL`.

- [ ] **Step 3: Run docs/check gate**

Run:

```bash
bun run check
```

Expected: PASS.

---

## Self-Review

- Spec coverage: covers mandatory RLS, tenant transaction context, FORCE RLS, Neon temporary branch validation and docs.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: `TenantTransaction`, `setTenantContext` and `withTenantContext` names are consistent across tasks.
- Risk: Task 3 is the broadest and must be implemented module-by-module with focused tests.
