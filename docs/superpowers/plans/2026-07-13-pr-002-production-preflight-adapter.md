# PR-002: Production preflight adapter implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production-preflight entrypoint pass the complete typed environment contract to `validateProductionPreflight`.

**Architecture:** Keep validation in `apps/web/src/ops/production-preflight.ts`; add one pure adapter module that maps a process environment to `ProductionPreflightEnv`. The script becomes a thin process boundary and the pure adapter is the test surface.

**Tech Stack:** Bun 1.3.11, TypeScript 6, Vitest 4, Turbo.

## Global Constraints

- Work on `main` is explicitly authorized by the user; do not commit or push unless they explicitly request it.
- Preserve existing unrelated worktree changes.
- Do not read, print, or persist secret values.
- Use TDD: each production behavior starts with a failing focused test.
- Preserve the existing production validation rules and error messages.
- `SUPPORT_EMAIL` and `DATABASE_POOL_MAX` must be forwarded unchanged from the process environment.

---

### Task 1: Extract and verify the preflight environment adapter

**Files:**

- Create: `apps/web/src/ops/production-preflight-env.ts`
- Create: `apps/web/src/ops/production-preflight-env.test.ts`
- Modify: `scripts/check-production-readiness.ts`
- Modify: `aidd_docs/codebase-deep-review-2026-07-13.md`

**Interfaces:**

- Consumes: `ProductionPreflightEnv` from `apps/web/src/ops/production-preflight.ts`.
- Produces: `readProductionPreflightEnv(env: NodeJS.ProcessEnv): ProductionPreflightEnv`.
- Script integration: `validateProductionPreflight(readProductionPreflightEnv(process.env))`.

- [x] **Step 1: Mark PR-002 in progress**

In the backlog index and PR-002 card in `aidd_docs/codebase-deep-review-2026-07-13.md`, replace its status `TODO` with `IN PROGRESS` before changing runtime code.

- [x] **Step 2: Write the failing adapter test**

Create `apps/web/src/ops/production-preflight-env.test.ts` with this test before creating the adapter:

```ts
import { describe, expect, it } from "vitest";
import { readProductionPreflightEnv } from "@/ops/production-preflight-env";

describe("readProductionPreflightEnv", () => {
  it("forwards support email and database pool max to production preflight", () => {
    const result = readProductionPreflightEnv({
      DATABASE_POOL_MAX: "3",
      SUPPORT_EMAIL: "support@example.com",
    });

    expect(result).toMatchObject({
      DATABASE_POOL_MAX: "3",
      SUPPORT_EMAIL: "support@example.com",
    });
  });

  it("does not invent values that are absent from the process environment", () => {
    const result = readProductionPreflightEnv({});

    expect(result.SUPPORT_EMAIL).toBeUndefined();
    expect(result.DATABASE_POOL_MAX).toBeUndefined();
  });
});
```

- [x] **Step 3: Verify the test fails for the expected missing module**

Run: `bun --cwd apps/web x vitest run src/ops/production-preflight-env.test.ts`

Expected: failure because `@/ops/production-preflight-env` does not exist.

- [x] **Step 4: Implement the pure adapter**

Create `apps/web/src/ops/production-preflight-env.ts`:

```ts
import type { ProductionPreflightEnv } from "./production-preflight";

export const readProductionPreflightEnv = (
  env: NodeJS.ProcessEnv
): ProductionPreflightEnv => ({
  ADMIN_APP_URL: env.ADMIN_APP_URL,
  ALLOW_PLAYWRIGHT_BOOTSTRAP: env.ALLOW_PLAYWRIGHT_BOOTSTRAP,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  DATABASE_POOL_MAX: env.DATABASE_POOL_MAX,
  DATABASE_URL: env.DATABASE_URL,
  DATABASE_URL_DIRECT: env.DATABASE_URL_DIRECT,
  DEPLOYMENT_SMOKE_URL: env.DEPLOYMENT_SMOKE_URL,
  E2E_DATABASE_URL: env.E2E_DATABASE_URL,
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  INNGEST_EVENT_KEY: env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: env.INNGEST_SIGNING_KEY,
  INTERNAL_R2_HEALTH_SECRET: env.INTERNAL_R2_HEALTH_SECRET,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
  PRODUCT_IMAGE_RECONCILE_SECRET: env.PRODUCT_IMAGE_RECONCILE_SECRET,
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
  R2_BUCKET_FINAL: env.R2_BUCKET_FINAL,
  R2_BUCKET_STAGING: env.R2_BUCKET_STAGING,
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
  RLS_DATABASE_URL: env.RLS_DATABASE_URL,
  SENTRY_DSN: env.SENTRY_DSN,
  SUPPORT_EMAIL: env.SUPPORT_EMAIL,
  UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
  VERCEL_ENV: env.VERCEL_ENV,
});
```

Replace the inline `env` object in `scripts/check-production-readiness.ts` with:

```ts
import { readProductionPreflightEnv } from "../apps/web/src/ops/production-preflight-env";

const result = validateProductionPreflight(
  readProductionPreflightEnv(process.env)
);
```

Keep the existing `console.error`, `process.exit(1)` and success output unchanged.

- [x] **Step 5: Verify the focused test passes**

Run: `bun --cwd apps/web x vitest run src/ops/production-preflight-env.test.ts`

Expected: 2 tests pass.

- [x] **Step 6: Verify integration and static checks**

Run, in this order:

1. `bun --cwd apps/web x vitest run src/ops/production-preflight-env.test.ts src/ops/production-preflight.test.ts`
2. `bun run typecheck`
3. `bun x ultracite check`

Expected: all commands exit 0. The integration test proves the actual script input adapter contains the required fields; it does not require production credentials.

- [x] **Step 7: Mark PR-002 done only after verification**

After the three commands above pass, change PR-002 status to `DONE` in both report locations and append:

```text
2026-07-13 — PR-002 — DONE
Commit/PR: not committed (user did not request a commit)
Arquivos: apps/web/src/ops/production-preflight-env.ts, apps/web/src/ops/production-preflight-env.test.ts, scripts/check-production-readiness.ts
Verificações: focused Vitest, web typecheck, Ultracite => exit 0
Risco residual: production credentials and external GitHub/Vercel wiring still require the manual production-preflight job.
```

## Self-review

- Scope coverage: the plan forwards both omitted variables and introduces a focused test against the pure entrypoint adapter.
- Placeholder scan: no placeholder implementation steps or unspecified commands remain.
- Type consistency: the adapter returns `ProductionPreflightEnv`, and the script passes that return value to `validateProductionPreflight`.
