import "server-only";

import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { buildProductInventorySummary } from "@/features/products/history";
import { getActiveProductImageGallery } from "@/features/products/image-access";
import {
  getProductByIdQuery,
  getProductPriceChangesByProductIdQuery,
  getProductSalesByProductIdQuery,
  getProductStockEntriesByProductIdQuery,
  getProductStockWriteOffsByProductIdQuery,
} from "@/features/products/queries";
import { getProductSalesHistoryMetrics } from "@/features/products/server";
import { requirePageAppContext } from "@/lib/app-session";

export const loadProductDetailPage = async (productId: string) => {
  const context = await requirePageAppContext();
  const product = await getProductByIdQuery(context.organizationId, productId);

  if (!product) {
    return null;
  }

  const [
    stockEntries,
    writeOffs,
    sales,
    categories,
    settings,
    salesMetrics,
    priceChanges,
    images,
  ] = await Promise.all([
    getProductStockEntriesByProductIdQuery(context.organizationId, productId),
    getProductStockWriteOffsByProductIdQuery(context.organizationId, productId),
    getProductSalesByProductIdQuery(context.organizationId, productId),
    listCategoriesWithUsage(context.organizationId),
    getCatalogSettings(context.organizationId),
    getProductSalesHistoryMetrics(context.organizationId, productId),
    getProductPriceChangesByProductIdQuery(context.organizationId, productId),
    getActiveProductImageGallery(context.organizationId, productId),
  ]);

  const averageCost = Number(product.costPrice);
  const initialEntryId =
    stockEntries
      .filter(
        (entry) =>
          entry.stockedOn === product.purchasedOn &&
          Math.abs(entry.createdAt.getTime() - product.createdAt.getTime()) <=
            60_000
      )
      .sort(
        (left, right) =>
          Math.abs(left.createdAt.getTime() - product.createdAt.getTime()) -
          Math.abs(right.createdAt.getTime() - product.createdAt.getTime())
      )[0]?.id ?? null;
  const inventorySummary = buildProductInventorySummary({
    averageCost,
    currentStock: product.stock,
    entries: stockEntries.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      date: entry.stockedOn,
      id: entry.id,
      isInitial: entry.id === initialEntryId,
      quantity: entry.quantity,
      unitCost: Number(entry.unitCost),
    })),
    sales: sales.map((saleItem) => ({
      cancelledAt: saleItem.cancelledAt
        ? saleItem.cancelledAt.toISOString()
        : null,
      createdAt: saleItem.createdAt.toISOString(),
      date: saleItem.occurredOn,
      id: saleItem.id,
      quantity: saleItem.quantity,
      saleId: saleItem.saleId,
      status: saleItem.status,
      unitCost: Number(saleItem.unitCostSnapshot),
    })),
    writeOffs: writeOffs.map((writeOff) => ({
      createdAt: writeOff.createdAt.toISOString(),
      date: writeOff.happenedOn,
      id: writeOff.id,
      notes: writeOff.notes,
      quantity: writeOff.quantity,
      reason: writeOff.reason,
      unitCost: Number(writeOff.unitCostSnapshot),
    })),
  });
  const imagesForDisplay = [...images];

  if (imagesForDisplay.length === 0 && product.image) {
    imagesForDisplay.push(product.image);
  }

  return {
    averageCost,
    categoriesForActions: categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    inventorySummary,
    images: imagesForDisplay,
    priceChanges,
    product,
    salesMetrics,
    settings,
  };
};
