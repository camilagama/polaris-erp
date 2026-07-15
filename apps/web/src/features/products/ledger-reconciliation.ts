import "server-only";

import { organization } from "@polaris/db/schema";
import {
  withInternalJobContext,
  withTenantContext,
} from "@polaris/db/tenant-context";
import { sql } from "drizzle-orm";

interface StockLedgerDiscrepancy extends Record<string, unknown> {
  ledgerStock: number;
  productId: string;
  projectedStock: number;
}

export interface StockLedgerReconciliationSummary {
  discrepancies: number;
  organizationsScanned: number;
  organizationsWithDiscrepancies: number;
}

interface StockLedgerReconciliationDependencies {
  findDiscrepancies?: (
    organizationId: string
  ) => Promise<StockLedgerDiscrepancy[]>;
  listOrganizationIds?: () => Promise<string[]>;
}

const findStockLedgerDiscrepancies = async (
  organizationId: string
): Promise<StockLedgerDiscrepancy[]> =>
  withTenantContext(organizationId, async (tx) => {
    const result = await tx.execute<StockLedgerDiscrepancy>(sql`
      select
        products.id as "productId",
        products.stock as "projectedStock",
        coalesce(sum(stock_movements.delta), 0)::integer as "ledgerStock"
      from products
      left join stock_movements
        on stock_movements.organization_id = products.organization_id
        and stock_movements.product_id = products.id
      where products.organization_id = ${organizationId}
      group by products.id, products.stock
      having products.stock <> coalesce(sum(stock_movements.delta), 0)::integer
      order by products.id
    `);

    return result.rows;
  });

const listOrganizationIds = async (): Promise<string[]> => {
  const organizations = await withInternalJobContext(
    "stock_ledger_reconciliation",
    (tx) => tx.select({ organizationId: organization.id }).from(organization)
  );

  return organizations.map(({ organizationId }) => organizationId);
};

export const reconcileStockLedger = async ({
  findDiscrepancies = findStockLedgerDiscrepancies,
  listOrganizationIds: getOrganizationIds = listOrganizationIds,
}: StockLedgerReconciliationDependencies = {}): Promise<StockLedgerReconciliationSummary> => {
  const organizationIds = await getOrganizationIds();
  const summary: StockLedgerReconciliationSummary = {
    discrepancies: 0,
    organizationsScanned: organizationIds.length,
    organizationsWithDiscrepancies: 0,
  };

  for (const organizationId of organizationIds) {
    const discrepancies = await findDiscrepancies(organizationId);

    summary.discrepancies += discrepancies.length;

    if (discrepancies.length > 0) {
      summary.organizationsWithDiscrepancies += 1;
    }
  }

  return summary;
};
