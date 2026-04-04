import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  DashboardContributionDay,
  DashboardContributionGraph,
  DashboardContributionLevel,
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

interface DashboardSaleRecord {
  feeAmount: number;
  freightAmount: number;
  occurredOn: string;
  paymentFeePayer: "customer" | "not_applicable" | "seller";
  status: "cancelled" | "completed";
  totalAmount: number;
}

interface DashboardSaleItemRecord {
  imageBlurDataUrl: string | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageWidth: number | null;
  lineTotal: number;
  occurredOn: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "cancelled" | "completed";
  unitCostSnapshot: number;
}

interface DashboardInventoryRecord {
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
        imageBlurDataUrl: item.imageBlurDataUrl,
        imageHeight: item.imageHeight,
        imageVersion: item.imageVersion,
        imageWidth: item.imageWidth,
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
  const salesCountByBucket = new Map<string, number>();
  let totalProductCosts = 0;
  let totalShippingAndSellerFees = 0;
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
    const sellerFeeAmount =
      sale.paymentFeePayer === "seller" ? sale.feeAmount : 0;
    const shippingAndSellerFees = roundCurrency(
      sale.freightAmount + sellerFeeAmount
    );

    soldByBucket.set(
      bucketKey,
      roundCurrency((soldByBucket.get(bucketKey) ?? 0) + soldAmount)
    );
    costByBucket.set(
      bucketKey,
      roundCurrency((costByBucket.get(bucketKey) ?? 0) + shippingAndSellerFees)
    );
    salesCountByBucket.set(
      bucketKey,
      (salesCountByBucket.get(bucketKey) ?? 0) + 1
    );

    totalSold = roundCurrency(totalSold + soldAmount);
    totalShippingAndSellerFees = roundCurrency(
      totalShippingAndSellerFees + shippingAndSellerFees
    );
    totalCosts = roundCurrency(totalCosts + shippingAndSellerFees);
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
    totalProductCosts = roundCurrency(totalProductCosts + itemCost);
    totalCosts = roundCurrency(totalCosts + itemCost);
  }

  const periodComparison: DashboardPeriodComparisonPoint[] = buckets.map(
    (bucket) => {
      const sold = soldByBucket.get(bucket.key) ?? 0;
      const costs = costByBucket.get(bucket.key) ?? 0;
      const salesCount = salesCountByBucket.get(bucket.key) ?? 0;

      return {
        costs,
        label: bucket.label,
        result: roundCurrency(sold - costs),
        salesCount,
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
    totalProductCosts,
    totalCosts,
    totalResult,
    totalSalesCount,
    totalShippingAndSellerFees,
    totalSold,
    topProducts: buildTopProducts({
      range,
      saleItems,
    }),
  };
};

interface ContributionGraphSaleRecord {
  occurredOn: string;
  status: "cancelled" | "completed";
  totalAmount: number;
}

const soldToContributionLevel = (sold: number): DashboardContributionLevel => {
  if (sold <= 0) {
    return 0;
  }

  if (sold <= 100) {
    return 1;
  }

  if (sold <= 299) {
    return 2;
  }

  return 3;
};

/**
 * Janela fixa de 6 meses corridos (do 1º dia do mês há 5 meses até `graphTo`).
 * Não limita o início à primeira venda no banco — dias anteriores aparecem como zero.
 */
export const resolveContributionGraphRange = (bounds: {
  to: string;
}): DashboardSelectedRange => {
  const today = formatDateInputValue(new Date());
  const graphTo = today <= bounds.to ? today : bounds.to;
  const graphToDate = parseISO(`${graphTo}T00:00:00`);
  const graphFromDate = startOfMonth(subMonths(graphToDate, 5));

  return {
    from: formatDateInputValue(graphFromDate),
    to: graphTo,
  };
};

export const buildDashboardContributionGraph = ({
  range,
  sales,
}: {
  range: DashboardSelectedRange;
  sales: ContributionGraphSaleRecord[];
}): DashboardContributionGraph => {
  const soldByDay = new Map<string, { count: number; sold: number }>();

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

    const previous = soldByDay.get(sale.occurredOn) ?? { count: 0, sold: 0 };
    soldByDay.set(sale.occurredOn, {
      count: previous.count + 1,
      sold: roundCurrency(previous.sold + sale.totalAmount),
    });
  }

  const fromDate = parseISO(`${range.from}T00:00:00`);
  const toDate = parseISO(`${range.to}T00:00:00`);
  const days: DashboardContributionDay[] = [];
  let totalSold = 0;
  let totalSalesCount = 0;

  for (
    let currentDate = fromDate;
    currentDate <= toDate;
    currentDate = addDays(currentDate, 1)
  ) {
    const date = formatDateInputValue(currentDate);
    const bucket = soldByDay.get(date);
    const sold = bucket?.sold ?? 0;
    const salesCount = bucket?.count ?? 0;
    const level = soldToContributionLevel(sold);

    days.push({
      date,
      level,
      salesCount,
      sold,
    });
    totalSold = roundCurrency(totalSold + sold);
    totalSalesCount += salesCount;
  }

  return {
    days,
    from: range.from,
    to: range.to,
    totalSalesCount,
    totalSold,
  };
};
