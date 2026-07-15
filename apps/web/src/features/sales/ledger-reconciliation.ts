import "server-only";

import { withTenantContext } from "@polaris/db/tenant-context";
import { sql } from "drizzle-orm";

export interface SaleFinancialDiscrepancy extends Record<string, unknown> {
  expectedChargedAmount: string;
  expectedFeeAmount: string;
  expectedTotalAmount: string;
  saleId: string;
  storedChargedAmount: string;
  storedFeeAmount: string;
  storedTotalAmount: string;
}

export const findSaleFinancialDiscrepancies = async (
  organizationId: string
): Promise<SaleFinancialDiscrepancy[]> =>
  withTenantContext(organizationId, async (tx) => {
    const result = await tx.execute<SaleFinancialDiscrepancy>(sql`
      with sale_item_totals as (
        select
          sale_id,
          organization_id,
          coalesce(sum(line_total), 0)::numeric(12, 2) as item_subtotal
        from sale_items
        where organization_id = ${organizationId}
        group by sale_id, organization_id
      ), expected_financials as (
        select
          sale.id as "saleId",
          sale.total_amount as "storedTotalAmount",
          sale.fee_amount as "storedFeeAmount",
          sale.charged_amount as "storedChargedAmount",
          round(
            coalesce(items.item_subtotal, 0)
            + sale.freight_amount
            + sale.additional_amount
            - sale.discount_amount,
            2
          ) as "expectedTotalAmount",
          round(
            case
              when sale.payment_method = 'card'
                and sale.payment_fee_payer = 'seller'
                then (
                  coalesce(items.item_subtotal, 0)
                  + sale.freight_amount
                  + sale.additional_amount
                  - sale.discount_amount
                ) * sale.payment_fee_percent / 100
              else 0
            end,
            2
          ) as "expectedFeeAmount",
          round(
            (
              coalesce(items.item_subtotal, 0)
              + sale.freight_amount
              + sale.additional_amount
              - sale.discount_amount
            ) + case
              when sale.payment_method = 'card'
                and sale.payment_fee_payer = 'customer'
                then (
                  coalesce(items.item_subtotal, 0)
                  + sale.freight_amount
                  + sale.additional_amount
                  - sale.discount_amount
                ) * sale.payment_fee_percent / 100
              else 0
            end,
            2
          ) as "expectedChargedAmount"
        from sales as sale
        left join sale_item_totals as items
          on items.sale_id = sale.id
          and items.organization_id = sale.organization_id
        where sale.organization_id = ${organizationId}
      )
      select *
      from expected_financials
      where "storedTotalAmount" <> "expectedTotalAmount"
        or "storedFeeAmount" <> "expectedFeeAmount"
        or "storedChargedAmount" <> "expectedChargedAmount"
      order by "saleId"
    `);

    return result.rows;
  });
