import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  DashboardInventoryCategory,
  DashboardMetrics,
  DashboardPeriodComparisonPoint,
  DashboardPeriodGranularity,
  DashboardSelectedRange,
  DashboardTopProduct,
} from "@/features/dashboard/contracts";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const MAX_CATEGORY_SLICES = 5;
const MAX_DAY_BUCKETS = 31;

export interface DashboardSaleRecord {
  feeAmount: number;
  freightAmount: number;
  occurredOn: string;
  status: "cancelled" | "completed";
  totalAmount: number;
}

export interface DashboardSaleItemRecord {
  lineTotal: number;
  occurredOn: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "cancelled" | "completed";
  unitCostSnapshot: number;
}

export interface DashboardInventoryRecord {
  categoryName: string;
  inventoryValue: number;
}

interface BuildDashboardMetricsInput {
  inventory: DashboardInventoryRecord[];
  range: DashboardSelectedRange;
  saleItems: DashboardSaleItemRecord[];
  sales: DashboardSaleRecord[];
}

interface DashboardPeriodBucket {
  key: string;
  label: string;
}

const isDateInRange = ({
  date,
  endInclusive,
  startInclusive,
}: {
  date: string;
  endInclusive: string;
  startInclusive: string;
}) => date >= startInclusive && date <= endInclusive;

const getResultStatus = (value: number) => {
  if (value > 0) {
    return "profit" as const;
  }

  if (value < 0) {
    return "loss" as const;
  }

  return "breakEven" as const;
};

const buildInventoryByCategory = (
  inventory: DashboardInventoryRecord[]
): DashboardInventoryCategory[] => {
  const inventoryByCategory = new Map<string, number>();

  for (const record of inventory) {
    if (record.inventoryValue <= 0) {
      continue;
    }

    const currentValue = inventoryByCategory.get(record.categoryName) ?? 0;
    inventoryByCategory.set(
      record.categoryName,
      roundCurrency(currentValue + record.inventoryValue)
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

const buildTopProducts = ({
  range,
  saleItems,
}: {
  range: DashboardSelectedRange;
  saleItems: DashboardSaleItemRecord[];
}): DashboardTopProduct[] => {
  const products = new Map<string, DashboardTopProduct>();

  for (const item of saleItems) {
    if (item.status !== "completed") {
      continue;
    }

    if (
      !isDateInRange({
        date: item.occurredOn,
        endInclusive: range.to,
        startInclusive: range.from,
      })
    ) {
      continue;
    }

    const currentProduct = products.get(item.productId);

    if (!currentProduct) {
      products.set(item.productId, {
        id: item.productId,
        name: item.productName,
        quantitySold: item.quantity,
        soldAmount: roundCurrency(item.lineTotal),
      });
      continue;
    }

    currentProduct.quantitySold += item.quantity;
    currentProduct.soldAmount = roundCurrency(
      currentProduct.soldAmount + item.lineTotal
    );
  }

  return Array.from(products.values())
    .sort(
      (left, right) =>
        right.quantitySold - left.quantitySold ||
        right.soldAmount - left.soldAmount ||
        left.name.localeCompare(right.name, "pt-BR")
    )
    .slice(0, 5);
};

const buildPeriodBuckets = ({
  from,
  to,
}: DashboardSelectedRange): {
  buckets: DashboardPeriodBucket[];
  granularity: DashboardPeriodGranularity;
} => {
  const fromDate = parseISO(`${from}T00:00:00`);
  const toDate = parseISO(`${to}T00:00:00`);
  const totalDays = differenceInCalendarDays(toDate, fromDate) + 1;

  if (totalDays <= MAX_DAY_BUCKETS) {
    const buckets: DashboardPeriodBucket[] = [];

    for (
      let currentDate = fromDate;
      currentDate <= toDate;
      currentDate = addDays(currentDate, 1)
    ) {
      buckets.push({
        key: formatDateInputValue(currentDate),
        label: format(currentDate, "dd/MM", {
          locale: ptBR,
        }),
      });
    }

    return {
      buckets,
      granularity: "day",
    };
  }

  const buckets: DashboardPeriodBucket[] = [];
  const lastMonthDate = startOfMonth(toDate);

  for (
    let currentDate = startOfMonth(fromDate);
    currentDate <= lastMonthDate;
    currentDate = addMonths(currentDate, 1)
  ) {
    buckets.push({
      key: format(currentDate, "yyyy-MM"),
      label: format(currentDate, "MMM/yy", {
        locale: ptBR,
      }),
    });
  }

  return {
    buckets,
    granularity: "month",
  };
};

const getBucketKey = ({
  date,
  granularity,
}: {
  date: string;
  granularity: DashboardPeriodGranularity;
}) => {
  if (granularity === "day") {
    return date;
  }

  return date.slice(0, 7);
};

export const buildDashboardMetrics = ({
  inventory,
  range,
  saleItems,
  sales,
}: BuildDashboardMetricsInput): DashboardMetrics => {
  const { buckets, granularity } = buildPeriodBuckets(range);
  const soldByBucket = new Map<string, number>();
  const costByBucket = new Map<string, number>();
  let totalSold = 0;
  let totalCosts = 0;
  let totalSalesCount = 0;

  for (const sale of sales) {
    if (sale.status !== "completed") {
      continue;
    }

    if (
      !isDateInRange({
        date: sale.occurredOn,
        endInclusive: range.to,
        startInclusive: range.from,
      })
    ) {
      continue;
    }

    const bucketKey = getBucketKey({
      date: sale.occurredOn,
      granularity,
    });
    const soldAmount = sale.totalAmount;
    const redirectedCosts = roundCurrency(sale.freightAmount + sale.feeAmount);

    soldByBucket.set(
      bucketKey,
      roundCurrency((soldByBucket.get(bucketKey) ?? 0) + soldAmount)
    );
    costByBucket.set(
      bucketKey,
      roundCurrency((costByBucket.get(bucketKey) ?? 0) + redirectedCosts)
    );

    totalSold = roundCurrency(totalSold + soldAmount);
    totalCosts = roundCurrency(totalCosts + redirectedCosts);
    totalSalesCount += 1;
  }

  for (const item of saleItems) {
    if (item.status !== "completed") {
      continue;
    }

    if (
      !isDateInRange({
        date: item.occurredOn,
        endInclusive: range.to,
        startInclusive: range.from,
      })
    ) {
      continue;
    }

    const bucketKey = getBucketKey({
      date: item.occurredOn,
      granularity,
    });
    const itemCost = roundCurrency(item.quantity * item.unitCostSnapshot);

    costByBucket.set(
      bucketKey,
      roundCurrency((costByBucket.get(bucketKey) ?? 0) + itemCost)
    );
    totalCosts = roundCurrency(totalCosts + itemCost);
  }

  const periodComparison: DashboardPeriodComparisonPoint[] = buckets.map(
    (bucket) => {
      const sold = soldByBucket.get(bucket.key) ?? 0;
      const costs = costByBucket.get(bucket.key) ?? 0;

      return {
        costs,
        label: bucket.label,
        result: roundCurrency(sold - costs),
        sold,
      };
    }
  );
  const totalResult = roundCurrency(totalSold - totalCosts);

  return {
    inventoryByCategory: buildInventoryByCategory(inventory),
    periodComparison,
    periodGranularity: granularity,
    resultStatus: getResultStatus(totalResult),
    selectedRange: range,
    totalCosts,
    totalResult,
    totalSalesCount,
    totalSold,
    topProducts: buildTopProducts({
      range,
      saleItems,
    }),
  };
};
