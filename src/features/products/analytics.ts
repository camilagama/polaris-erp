import { addDays, format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  ProductAnalytics,
  ProductCatalogPerformancePoint,
  ProductInventoryCategory,
  ProductSalesHistoryMetrics,
  ProductSalesPoint,
} from "@/features/products/contracts";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const MAX_CATEGORY_SLICES = 5;
const MAX_DAY_BUCKETS = 31;

interface ProductInventoryRecord {
  archivedAt: Date | null;
  categoryName: string;
  costPrice: number;
  stock: number;
}

interface ProductPurchaseRecord {
  occurredOn: string;
  quantity: number;
  unitCost: number;
}

interface ProductSaleRecord {
  lineTotal: number;
  occurredOn: string;
  quantity: number;
  status: "cancelled" | "completed";
}

const buildInventoryByCategory = (
  inventory: ProductInventoryRecord[]
): ProductInventoryCategory[] => {
  const inventoryByCategory = new Map<string, number>();

  for (const record of inventory) {
    if (record.archivedAt || record.stock <= 0) {
      continue;
    }

    const inventoryValue = roundCurrency(record.stock * record.costPrice);

    if (inventoryValue <= 0) {
      continue;
    }

    inventoryByCategory.set(
      record.categoryName,
      roundCurrency(
        (inventoryByCategory.get(record.categoryName) ?? 0) + inventoryValue
      )
    );
  }

  const categories = Array.from(inventoryByCategory.entries())
    .map(([categoryName, inventoryValue]) => ({
      categoryName,
      inventoryValue,
    }))
    .sort(
      (left, right) =>
        right.inventoryValue - left.inventoryValue ||
        left.categoryName.localeCompare(right.categoryName, "pt-BR")
    );

  if (categories.length <= MAX_CATEGORY_SLICES) {
    return categories;
  }

  const visibleCategories = categories.slice(0, MAX_CATEGORY_SLICES);
  const groupedValue = roundCurrency(
    categories
      .slice(MAX_CATEGORY_SLICES)
      .reduce((acc, category) => acc + category.inventoryValue, 0)
  );

  return [
    ...visibleCategories,
    {
      categoryName: "Outros",
      inventoryValue: groupedValue,
    },
  ];
};

const buildDayBuckets = ({ from, to }: { from: string; to: string }) => {
  const buckets: Array<{ key: string; label: string }> = [];
  let currentDate = parseISO(`${from}T00:00:00`);
  const toDate = parseISO(`${to}T00:00:00`);

  while (currentDate <= toDate) {
    buckets.push({
      key: formatDateInputValue(currentDate),
      label: format(currentDate, "dd/MM", { locale: ptBR }),
    });
    currentDate = addDays(currentDate, 1);
  }

  return buckets;
};

const buildRecentPerformance = ({
  purchases,
  sales,
  to,
}: {
  purchases: ProductPurchaseRecord[];
  sales: ProductSaleRecord[];
  to: string;
}): ProductCatalogPerformancePoint[] => {
  const fromDate = subDays(parseISO(`${to}T00:00:00`), MAX_DAY_BUCKETS - 1);
  const from = formatDateInputValue(fromDate);
  const bucketMap = new Map<
    string,
    { purchaseAmount: number; soldAmount: number }
  >(
    buildDayBuckets({ from, to }).map((bucket) => [
      bucket.key,
      {
        purchaseAmount: 0,
        soldAmount: 0,
      },
    ])
  );

  for (const sale of sales) {
    if (
      sale.status !== "completed" ||
      sale.occurredOn < from ||
      sale.occurredOn > to
    ) {
      continue;
    }

    const bucket = bucketMap.get(sale.occurredOn);

    if (!bucket) {
      continue;
    }

    bucket.soldAmount = roundCurrency(bucket.soldAmount + sale.lineTotal);
  }

  for (const purchase of purchases) {
    if (purchase.occurredOn < from || purchase.occurredOn > to) {
      continue;
    }

    const bucket = bucketMap.get(purchase.occurredOn);

    if (!bucket) {
      continue;
    }

    bucket.purchaseAmount = roundCurrency(
      bucket.purchaseAmount + purchase.quantity * purchase.unitCost
    );
  }

  return buildDayBuckets({ from, to }).map((bucket) => ({
    label: bucket.label,
    purchaseAmount: bucketMap.get(bucket.key)?.purchaseAmount ?? 0,
    soldAmount: bucketMap.get(bucket.key)?.soldAmount ?? 0,
  }));
};

const buildHistoryTrend = (sales: ProductSaleRecord[]): ProductSalesPoint[] => {
  const completedSales = sales.filter((sale) => sale.status === "completed");

  if (completedSales.length === 0) {
    return [];
  }

  const dateSet = new Set(completedSales.map((sale) => sale.occurredOn));
  const sortedDates = Array.from(dateSet).sort((left, right) =>
    left.localeCompare(right)
  );
  const granularity = sortedDates.length <= MAX_DAY_BUCKETS ? "day" : "month";
  const grouped = new Map<string, number>();

  for (const sale of completedSales) {
    const key =
      granularity === "day" ? sale.occurredOn : sale.occurredOn.slice(0, 7);

    grouped.set(key, (grouped.get(key) ?? 0) + sale.quantity);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, quantitySold]) => ({
      label:
        granularity === "day"
          ? format(parseISO(`${key}T00:00:00`), "dd/MM", { locale: ptBR })
          : format(parseISO(`${key}-01T00:00:00`), "MMM/yy", {
              locale: ptBR,
            }),
      quantitySold,
    }));
};

export const buildProductAnalytics = ({
  inventory,
  purchases,
  sales,
  today = formatDateInputValue(),
}: {
  inventory: ProductInventoryRecord[];
  purchases: ProductPurchaseRecord[];
  sales: ProductSaleRecord[];
  today?: string;
}): ProductAnalytics => {
  let totalUnitsInStock = 0;
  let totalInventoryInvestment = 0;
  let totalActiveProductsInStock = 0;

  for (const product of inventory) {
    if (product.archivedAt) {
      continue;
    }

    totalUnitsInStock += product.stock;
    totalInventoryInvestment = roundCurrency(
      totalInventoryInvestment + product.stock * product.costPrice
    );

    if (product.stock > 0) {
      totalActiveProductsInStock += 1;
    }
  }

  return {
    inventoryByCategory: buildInventoryByCategory(inventory),
    recentPerformance: buildRecentPerformance({
      purchases,
      sales,
      to: today,
    }),
    totalActiveProductsInStock,
    totalInventoryInvestment,
    totalUnitsInStock,
  };
};

export const buildProductSalesHistoryMetrics = ({
  sales,
}: {
  sales: ProductSaleRecord[];
}): ProductSalesHistoryMetrics => {
  const completedSales = sales.filter((sale) => sale.status === "completed");
  const totalQuantitySold = completedSales.reduce(
    (sum, sale) => sum + sale.quantity,
    0
  );
  const totalSoldAmount = roundCurrency(
    completedSales.reduce((sum, sale) => sum + sale.lineTotal, 0)
  );

  return {
    totalQuantitySold,
    totalSoldAmount,
    trend: buildHistoryTrend(completedSales),
  };
};
