import "server-only";

import { and, asc, eq, gt, gte, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import {
  categories,
  productStockEntries,
  products,
  saleItems,
  sales,
} from "@/db/schema";
import { withTenantContext } from "@/db/tenant-context";
import type {
  DashboardContributionGraph,
  DashboardMetrics,
  DashboardSelectedRange,
} from "@/features/dashboard/contracts";
import {
  buildDashboardContributionGraph,
  buildDashboardMetrics,
  resolveContributionGraphRange,
} from "@/features/dashboard/metrics";
import { buildOrganizationCacheTags } from "@/lib/cache-tags";
import { formatDateInputValue } from "@/lib/domain/date";

export const getDashboardDateBounds = async (
  organizationId: string
): Promise<{
  from: string;
  to: string;
}> => {
  "use cache: remote";
  cacheTag(buildOrganizationCacheTags(organizationId).analytics);
  cacheLife("minutes");

  const [salesRows, stockEntriesRows] = await withTenantContext(
    organizationId,
    (tx) =>
      Promise.all([
        tx
          .select({
            minOccurredOn: sql<string | null>`min(${sales.occurredOn})`,
          })
          .from(sales)
          .where(eq(sales.organizationId, organizationId)),
        tx
          .select({
            minStockedOn: sql<
              string | null
            >`min(${productStockEntries.stockedOn})`,
          })
          .from(productStockEntries)
          .where(eq(productStockEntries.organizationId, organizationId)),
      ])
  );
  const salesRow = salesRows[0];
  const stockEntriesRow = stockEntriesRows[0];
  const today = formatDateInputValue();
  const earliestMovementDate = [
    salesRow?.minOccurredOn,
    stockEntriesRow?.minStockedOn,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))[0];

  return {
    from: earliestMovementDate ?? today,
    to: today,
  };
};

const getDashboardMetricsByRange = cache(
  async (
    organizationId: string,
    from: string,
    to: string
  ): Promise<DashboardMetrics> => {
    const [salesRows, saleItemRows, inventoryRows] = await withTenantContext(
      organizationId,
      (tx) =>
        Promise.all([
          tx
            .select({
              feeAmount: sales.feeAmount,
              freightAmount: sales.freightAmount,
              occurredOn: sales.occurredOn,
              paymentFeePayer: sales.paymentFeePayer,
              status: sales.status,
              totalAmount: sales.totalAmount,
            })
            .from(sales)
            .where(
              and(
                eq(sales.organizationId, organizationId),
                gte(sales.occurredOn, from),
                lte(sales.occurredOn, to)
              )
            ),
          tx
            .select({
              imageBlurDataUrl: products.imageBlurDataUrl,
              imageHeight: products.imageHeight,
              imageVersion: products.imageVersion,
              imageWidth: products.imageWidth,
              lineTotal: saleItems.lineTotal,
              occurredOn: sales.occurredOn,
              productId: saleItems.productId,
              productName: saleItems.productNameSnapshot,
              quantity: saleItems.quantity,
              status: sales.status,
              unitCostSnapshot: saleItems.unitCostSnapshot,
            })
            .from(saleItems)
            .innerJoin(
              sales,
              and(
                eq(saleItems.saleId, sales.id),
                eq(sales.organizationId, organizationId)
              )
            )
            .innerJoin(
              products,
              and(
                eq(saleItems.productId, products.id),
                eq(products.organizationId, organizationId)
              )
            )
            .where(
              and(
                eq(saleItems.organizationId, organizationId),
                eq(sales.organizationId, organizationId),
                eq(products.organizationId, organizationId),
                gte(sales.occurredOn, from),
                lte(sales.occurredOn, to)
              )
            ),
          tx
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
            .orderBy(asc(categories.name)),
        ])
    );

    return buildDashboardMetrics({
      inventory: inventoryRows.map((row) => ({
        categoryName: row.categoryName,
        inventoryValue: Number(row.inventoryValue),
      })),
      range: { from, to },
      saleItems: saleItemRows.map((row) => ({
        imageBlurDataUrl: row.imageBlurDataUrl,
        imageHeight: row.imageHeight,
        imageVersion: row.imageVersion,
        imageWidth: row.imageWidth,
        lineTotal: Number(row.lineTotal),
        occurredOn: row.occurredOn,
        productId: row.productId,
        productName: row.productName,
        quantity: Number(row.quantity),
        status: row.status as "cancelled" | "completed",
        unitCostSnapshot: Number(row.unitCostSnapshot),
      })),
      sales: salesRows.map((row) => ({
        feeAmount: Number(row.feeAmount),
        freightAmount: Number(row.freightAmount),
        occurredOn: row.occurredOn,
        paymentFeePayer: row.paymentFeePayer as
          | "customer"
          | "not_applicable"
          | "seller",
        status: row.status as "cancelled" | "completed",
        totalAmount: Number(row.totalAmount),
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
    (tx) =>
      Promise.all([
        tx
          .select({
            total: sql<string>`coalesce(sum(${productStockEntries.quantity} * ${productStockEntries.unitCost}), '0')`,
          })
          .from(productStockEntries)
          .where(eq(productStockEntries.organizationId, organizationId)),
        tx
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
          ),
        tx
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
          ),
      ])
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
