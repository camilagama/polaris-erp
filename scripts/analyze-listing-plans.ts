import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Client } from "pg";
import {
  collectPlanIndexNames,
  type PostgresExplainResult,
  planUsesAnyIndex,
} from "@/ops/postgres-plan";

export interface ListingPlanCheck {
  countSql: string;
  expectedIndexes: string[];
  explainSql: string;
  name: string;
  usesSearchTerm?: boolean;
}

export interface ListingPlanResult {
  executionMs: number | null;
  expectedIndexes: string[];
  measuredRows: number;
  name: string;
  planningMs: number | null;
  representative: boolean;
  result: "ok" | "skipped-small-dataset";
  usedIndexes: string[];
}

const localEnv = existsSync(".env.local")
  ? parse(readFileSync(".env.local"))
  : {};
const env = { ...localEnv, ...process.env };

const databaseUrl = env.DATABASE_URL;
const organizationId = env.PERFORMANCE_ORGANIZATION_ID;
const searchTerm = env.PERFORMANCE_SEARCH_TERM?.trim();
const userId = env.PERFORMANCE_USER_ID;
const minimumRows = Number(env.PERFORMANCE_MIN_ROWS ?? 500);
const requireRepresentative = env.PERFORMANCE_REQUIRE_REPRESENTATIVE === "true";

export const buildListingPlanChecks = (
  requestedSearchTerm: string | undefined
): ListingPlanCheck[] => {
  const checks: ListingPlanCheck[] = [
    {
      countSql: `
      select count(*)::int as count
      from products
      where organization_id = $1
        and archived_at is null
    `,
      expectedIndexes: ["products_active_list_idx"],
      explainSql: `
      select
        products.id,
        products.name,
        products.created_at,
        categories.name as category_name
      from products
      inner join categories
        on products.category_id = categories.id
       and categories.organization_id = $1
      where products.organization_id = $1
        and products.archived_at is null
      order by products.name asc, products.created_at asc, products.id asc
      limit 16
    `,
      name: "products-active-list",
    },
    {
      countSql: `
      select count(*)::int as count
      from products
      where organization_id = $1
        and archived_at is not null
    `,
      expectedIndexes: ["products_archived_list_idx"],
      explainSql: `
      select
        products.id,
        products.name,
        products.created_at,
        categories.name as category_name
      from products
      inner join categories
        on products.category_id = categories.id
       and categories.organization_id = $1
      where products.organization_id = $1
        and products.archived_at is not null
      order by products.name asc, products.created_at asc, products.id asc
      limit 16
    `,
      name: "products-archived-list",
    },
    {
      countSql: `
      select count(*)::int as count
      from sales
      where organization_id = $1
    `,
      expectedIndexes: ["sales_organization_occurred_on_created_at_id_idx"],
      explainSql: `
      select
        sales.id,
        sales.occurred_on,
        sales.created_at,
        (
          select count(*)
          from sale_items
          where sale_items.sale_id = sales.id
            and sale_items.organization_id = $1
        ) as item_count
      from sales
      where sales.organization_id = $1
      order by sales.occurred_on desc, sales.created_at desc, sales.id desc
      limit 16
    `,
      name: "sales-list",
    },
  ];

  if (!requestedSearchTerm) {
    return checks;
  }

  checks.push(
    {
      countSql: `
        select count(*)::int as count
        from products
        where organization_id = $1
          and archived_at is null
          and name ilike $2
      `,
      expectedIndexes: ["products_active_name_trgm_idx"],
      explainSql: `
        select
          products.id,
          products.name,
          products.created_at,
          categories.name as category_name
        from products
        inner join categories
          on products.category_id = categories.id
         and categories.organization_id = $1
        where products.organization_id = $1
          and products.archived_at is null
          and products.name ilike $2
        order by products.name asc, products.created_at asc, products.id asc
        limit 16
      `,
      name: "products-active-search",
      usesSearchTerm: true,
    },
    {
      countSql: `
        select count(*)::int as count
        from sales
        where organization_id = $1
          and customer_name ilike $2
      `,
      expectedIndexes: ["sales_customer_name_trgm_idx"],
      explainSql: `
        select
          sales.id,
          sales.customer_name,
          sales.occurred_on,
          sales.created_at
        from sales
        where sales.organization_id = $1
          and sales.customer_name ilike $2
        order by sales.occurred_on desc, sales.created_at desc, sales.id desc
        limit 16
      `,
      name: "sales-customer-search",
      usesSearchTerm: true,
    }
  );

  return checks;
};

export const readExplainResult = (rawPlan: unknown): PostgresExplainResult => {
  if (typeof rawPlan === "string") {
    return JSON.parse(rawPlan)[0];
  }

  if (Array.isArray(rawPlan)) {
    return rawPlan[0] as PostgresExplainResult;
  }

  throw new Error("Formato inesperado do EXPLAIN JSON.");
};

export const validateListingPlanResults = (
  checks: ListingPlanResult[],
  {
    requireRepresentative: representativeRequired,
  }: { requireRepresentative: boolean }
): void => {
  if (!representativeRequired) {
    return;
  }

  const skippedChecks = checks
    .filter((check) => !check.representative)
    .map((check) => check.name);

  if (skippedChecks.length > 0) {
    throw new Error(
      `Representative listing-plan evidence required, but these checks used small datasets: ${skippedChecks.join(
        ", "
      )}`
    );
  }
};

async function analyzeListingPlan(
  client: Client,
  check: ListingPlanCheck
): Promise<ListingPlanResult> {
  const queryParams = check.usesSearchTerm
    ? [organizationId, `%${searchTerm}%`]
    : [organizationId];
  const countResult = await client.query(check.countSql, queryParams);
  const measuredRows = Number(countResult.rows[0]?.count ?? 0);
  const explainResult = await client.query(
    `explain (analyze, buffers, format json) ${check.explainSql}`,
    queryParams
  );
  const explain = readExplainResult(explainResult.rows[0]?.["QUERY PLAN"]);
  const usedIndexes = collectPlanIndexNames(explain.Plan);
  const representative = measuredRows >= minimumRows;
  const usesExpectedIndex = planUsesAnyIndex(
    explain.Plan,
    check.expectedIndexes
  );

  if (representative && !usesExpectedIndex) {
    throw new Error(
      `${check.name} nao usou os indices esperados (${check.expectedIndexes.join(
        ", "
      )}) com ${measuredRows} linhas. Indices usados: ${
        usedIndexes.join(", ") || "nenhum"
      }.`
    );
  }

  return {
    executionMs: explain["Execution Time"] ?? null,
    expectedIndexes: check.expectedIndexes,
    measuredRows,
    name: check.name,
    planningMs: explain["Planning Time"] ?? null,
    representative,
    result: representative ? "ok" : "skipped-small-dataset",
    usedIndexes,
  };
}

const main = async () => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL ausente.");
  }

  if (!organizationId) {
    throw new Error("PERFORMANCE_ORGANIZATION_ID ausente.");
  }

  if (!Number.isFinite(minimumRows) || minimumRows < 1) {
    throw new Error("PERFORMANCE_MIN_ROWS precisa ser um numero positivo.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const currentUserResult = await client.query(`
      select
        current_user,
        (select rolbypassrls from pg_roles where rolname = current_user) as bypassrls
    `);
    const currentUser = currentUserResult.rows[0];

    await client.query("begin read only");
    try {
      await client.query("select set_config($1, $2, true)", [
        "app.organization_id",
        organizationId,
      ]);

      if (userId) {
        await client.query("select set_config($1, $2, true)", [
          "app.user_id",
          userId,
        ]);
      }

      const checks: ListingPlanResult[] = [];

      for (const check of buildListingPlanChecks(searchTerm)) {
        checks.push(await analyzeListingPlan(client, check));
      }

      validateListingPlanResults(checks, { requireRepresentative });

      console.log(
        JSON.stringify(
          {
            checks,
            currentUser: currentUser.current_user,
            minimumRows,
            representativeRequired: requireRepresentative,
            result: "listing-plan-analysis-ok",
            runtimeRoleBypassRls: currentUser.bypassrls,
          },
          null,
          2
        )
      );
    } finally {
      await client.query("rollback");
    }
  } finally {
    await client.end();
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
