import "server-only";

import {
  categories,
  productStockEntries,
  products,
  saleItems,
  sales,
} from "@polaris/db/schema";
import { withTenantContext } from "@polaris/db/tenant-context";
import { and, asc, eq, gt, gte, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import type {
  DashboardContributionGraph,
  DashboardMetrics,
  DashboardSelectedRange,
  DashboardTopProduct,
} from "@/features/dashboard/contracts";
import {
  buildDashboardContributionGraph,
  buildDashboardMetricsFromAggregates,
  resolveContributionGraphRange,
} from "@/features/dashboard/metrics";
import { getOperationalDateBounds } from "@/features/operations/date-bounds";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";

const MAX_DAILY_DASHBOARD_BUCKETS = 31;

interface DashboardPeriodSalesAggregateRow extends Record<string, unknown> {
  bucketKey: string;
  salesCount: number | string;
  shippingAndSellerFees: string;
  sold: string;
}

interface DashboardPeriodProductCostAggregateRow
  extends Record<string, unknown> {
  bucketKey: string;
  productCosts: string;
}

interface DashboardTopProductAggregateRow extends Record<string, unknown> {
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
  productId: string;
  productName: string;
  quantitySold: number | string;
  soldAmount: string;
}

const getDashboardSqlGranularity = ({
  from,
  to,
}: DashboardSelectedRange): "day" | "month" => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const millisecondsPerDay = 86_400_000;
  const totalDays =
    Math.floor((toDate.getTime() - fromDate.getTime()) / millisecondsPerDay) +
    1;

  return totalDays <= MAX_DAILY_DASHBOARD_BUCKETS ? "day" : "month";
};

const getDashboardSalesBucketSql = (range: DashboardSelectedRange) => {
  if (getDashboardSqlGranularity(range) === "day") {
    return sql<string>`s.occurred_on`;
  }

  return sql<string>`to_char(date_trunc('month', s.occurred_on::date), 'YYYY-MM')`;
};

export const getDashboardDateBounds = getOperationalDateBounds;

const getDashboardMetricsByRange = cache(
  async (
    organizationId: string,
    from: string,
    to: string
  ): Promise<DashboardMetrics> => {
    const range = { from, to };
    const salesBucketSql = getDashboardSalesBucketSql(range);
    const [
      periodSalesRows,
      periodProductCostRows,
      topProductRows,
      inventoryRows,
    ] = await withTenantContext(organizationId, async (tx) => {
      const periodSalesResult =
        await tx.execute<DashboardPeriodSalesAggregateRow>(sql`
          select
            ${salesBucketSql} as "bucketKey",
            coalesce(sum(s.total_amount), '0') as "sold",
            coalesce(
              sum(
                s.freight_amount
                + case
                  when s.payment_fee_payer = 'seller' then s.fee_amount
                  else 0
                end
              ),
              '0'
            ) as "shippingAndSellerFees",
            count(*)::int as "salesCount"
          from sales s
          where s.organization_id = ${organizationId}
            and s.status = 'completed'
            and s.occurred_on >= ${from}
            and s.occurred_on <= ${to}
          group by "bucketKey"
        `);
      const periodProductCostResult =
        await tx.execute<DashboardPeriodProductCostAggregateRow>(sql`
          select
            ${salesBucketSql} as "bucketKey",
            coalesce(sum(si.quantity * si.unit_cost_snapshot), '0') as "productCosts"
          from sale_items si
          inner join sales s
            on s.id = si.sale_id
            and s.organization_id = ${organizationId}
          where si.organization_id = ${organizationId}
            and s.status = 'completed'
            and s.occurred_on >= ${from}
            and s.occurred_on <= ${to}
          group by "bucketKey"
        `);
      const topProductResult =
        await tx.execute<DashboardTopProductAggregateRow>(sql`
          select
            si.product_id as "productId",
            si.product_name_snapshot as "productName",
            p.image_blur_data_url as "imageBlurDataUrl",
            p.image_height as "imageHeight",
            p.image_version as "imageVersion",
            p.image_width as "imageWidth",
            coalesce(sum(si.quantity), 0)::int as "quantitySold",
            coalesce(sum(si.line_total), '0') as "soldAmount"
          from sale_items si
          inner join sales s
            on s.id = si.sale_id
            and s.organization_id = ${organizationId}
          inner join products p
            on p.id = si.product_id
            and p.organization_id = ${organizationId}
          where si.organization_id = ${organizationId}
            and s.status = 'completed'
            and s.occurred_on >= ${from}
            and s.occurred_on <= ${to}
          group by
            si.product_id,
            si.product_name_snapshot,
            p.image_blur_data_url,
            p.image_height,
            p.image_version,
            p.image_width
          order by
            sum(si.quantity) desc,
            sum(si.line_total) desc,
            si.product_name_snapshot asc
          limit 5
        `);
      const inventoryResult = await tx
        .select({
          categoryName: categories.name,
          inventoryValue: sql<string>`coalesce(sum(${products.stock} * ${products.costPrice}), '0')`,
        })
        .from(products)
        .innerJoin(
          categories,
          and(
            eq(products.categoryId, categories.id),
            eq(categories.organizationId, organizationId)
          )
        )
        .where(
          and(
            eq(products.organizationId, organizationId),
            gt(products.stock, 0)
          )
        )
        .groupBy(categories.name)
        .orderBy(asc(categories.name));

      return [
        periodSalesResult.rows,
        periodProductCostResult.rows,
        topProductResult.rows,
        inventoryResult,
      ] as const;
    });

    return buildDashboardMetricsFromAggregates({
      inventory: inventoryRows.map((row) => ({
        categoryName: row.categoryName,
        inventoryValue: Number(row.inventoryValue),
      })),
      periodProductCosts: periodProductCostRows.map((row) => ({
        bucketKey: row.bucketKey,
        productCosts: Number(row.productCosts),
      })),
      periodSales: periodSalesRows.map((row) => ({
        bucketKey: row.bucketKey,
        salesCount: Number(row.salesCount),
        shippingAndSellerFees: Number(row.shippingAndSellerFees),
        sold: Number(row.sold),
      })),
      range,
      topProducts: topProductRows.map<DashboardTopProduct>((row) => ({
        id: row.productId,
        imageBlurDataUrl: row.imageBlurDataUrl,
        imageHeight: row.imageHeight,
        imageVersion: row.imageVersion,
        imageWidth: row.imageWidth,
        name: row.productName,
        quantitySold: Number(row.quantitySold),
        soldAmount: Number(row.soldAmount),
      })),
    });
  }
);

export const getDashboardMetrics = async (
  organizationId: string,
  range: DashboardSelectedRange
): Promise<DashboardMetrics> =>
  getDashboardMetricsByRange(organizationId, range.from, range.to);

export const getDashboardContributionGraph = async (
  organizationId: string
): Promise<DashboardContributionGraph> => {
  const bounds = await getDashboardDateBounds(organizationId);
  const range = resolveContributionGraphRange(bounds);

  const salesRows = await withTenantContext(organizationId, (tx) =>
    tx
      .select({
        occurredOn: sales.occurredOn,
        status: sales.status,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, organizationId),
          gte(sales.occurredOn, range.from),
          lte(sales.occurredOn, range.to)
        )
      )
  );

  return buildDashboardContributionGraph({
    range,
    sales: salesRows.map((row) => ({
      occurredOn: row.occurredOn,
      status: row.status as "cancelled" | "completed",
      totalAmount: Number(row.totalAmount),
    })),
  });
};

export const getDashboardGlobalStats = async (organizationId: string) => {
  "use cache: remote";
  cacheTag(buildOrganizationCacheTags(organizationId).analytics);
  cacheLife("minutes");

  const [investmentRows, salesRows, saleItemsRows] = await withTenantContext(
    organizationId,
    async (tx) => {
      const investmentResult = await tx
        .select({
          total: sql<string>`coalesce(sum(${productStockEntries.quantity} * ${productStockEntries.unitCost}), '0')`,
        })
        .from(productStockEntries)
        .where(eq(productStockEntries.organizationId, organizationId));
      const salesResult = await tx
        .select({
          totalAmount: sql<string>`coalesce(sum(${sales.totalAmount}), '0')`,
          totalFreight: sql<string>`coalesce(sum(${sales.freightAmount}), '0')`,
          totalFee: sql<string>`coalesce(sum(case when ${sales.paymentFeePayer} = 'seller' then ${sales.feeAmount} else 0 end), '0')`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, organizationId),
            eq(sales.status, "completed")
          )
        );
      const saleItemsResult = await tx
        .select({
          totalCost: sql<string>`coalesce(sum(${saleItems.quantity} * ${saleItems.unitCostSnapshot}), '0')`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(sales.id, saleItems.saleId))
        .where(
          and(
            eq(saleItems.organizationId, organizationId),
            eq(sales.organizationId, organizationId),
            eq(sales.status, "completed")
          )
        );

      return [investmentResult, salesResult, saleItemsResult] as const;
    }
  );

  const investment = Number(investmentRows[0]?.total ?? 0);
  const totalAmount = Number(salesRows[0]?.totalAmount ?? 0);
  const totalFreight = Number(salesRows[0]?.totalFreight ?? 0);
  const totalFee = Number(salesRows[0]?.totalFee ?? 0);
  const totalItemCost = Number(saleItemsRows[0]?.totalCost ?? 0);

  const profit = totalAmount - totalFreight - totalFee - totalItemCost;

  return {
    investment,
    profit,
  };
};
