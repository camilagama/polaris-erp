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
  SalesAnalytics,
  SalesPaymentMethodSummary,
  SalesPerformancePoint,
  SalesPeriodGranularity,
} from "@/features/sales/contracts";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const MAX_DAY_BUCKETS = 31;

interface SalesAnalyticsSaleRecord {
  feeAmount: number;
  freightAmount: number;
  occurredOn: string;
  paymentMethod: "card" | "pix";
  status: "cancelled" | "completed";
  totalAmount: number;
}

interface SalesAnalyticsSaleItemRecord {
  occurredOn: string;
  quantity: number;
  status: "cancelled" | "completed";
  unitCostSnapshot: number;
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

const getPeriodBuckets = ({
  from,
  to,
}: {
  from: string;
  to: string;
}): {
  buckets: Array<{ key: string; label: string }>;
  granularity: SalesPeriodGranularity;
} => {
  const fromDate = parseISO(`${from}T00:00:00`);
  const toDate = parseISO(`${to}T00:00:00`);
  const totalDays = differenceInCalendarDays(toDate, fromDate) + 1;

  if (totalDays <= MAX_DAY_BUCKETS) {
    const buckets: Array<{ key: string; label: string }> = [];

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

  const buckets: Array<{ key: string; label: string }> = [];
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
  granularity: SalesPeriodGranularity;
}) => (granularity === "day" ? date : date.slice(0, 7));

const buildPaymentMethods = (
  sales: SalesAnalyticsSaleRecord[]
): SalesPaymentMethodSummary[] => {
  const paymentMethods = new Map<"card" | "pix", SalesPaymentMethodSummary>();

  for (const sale of sales) {
    if (sale.status !== "completed") {
      continue;
    }

    const currentMethod = paymentMethods.get(sale.paymentMethod) ?? {
      paymentMethod: sale.paymentMethod,
      salesCount: 0,
      totalAmount: 0,
    };

    currentMethod.salesCount += 1;
    currentMethod.totalAmount = roundCurrency(
      currentMethod.totalAmount + sale.totalAmount
    );
    paymentMethods.set(sale.paymentMethod, currentMethod);
  }

  return Array.from(paymentMethods.values()).sort(
    (left, right) =>
      right.salesCount - left.salesCount ||
      right.totalAmount - left.totalAmount ||
      left.paymentMethod.localeCompare(right.paymentMethod)
  );
};

export const buildSalesAnalytics = ({
  range,
  saleItems,
  sales,
}: {
  range: {
    from: string;
    to: string;
  };
  saleItems: SalesAnalyticsSaleItemRecord[];
  sales: SalesAnalyticsSaleRecord[];
}): SalesAnalytics => {
  const { buckets, granularity } = getPeriodBuckets(range);
  const soldByBucket = new Map<string, number>();
  const profitByBucket = new Map<string, number>();
  let totalSold = 0;
  let totalCosts = 0;
  let completedSalesCount = 0;
  let cancelledSalesCount = 0;

  for (const sale of sales) {
    if (
      !isDateInRange({
        date: sale.occurredOn,
        endInclusive: range.to,
        startInclusive: range.from,
      })
    ) {
      continue;
    }

    if (sale.status === "cancelled") {
      cancelledSalesCount += 1;
      continue;
    }

    const bucketKey = getBucketKey({
      date: sale.occurredOn,
      granularity,
    });
    const saleCosts = roundCurrency(sale.freightAmount + sale.feeAmount);

    soldByBucket.set(
      bucketKey,
      roundCurrency((soldByBucket.get(bucketKey) ?? 0) + sale.totalAmount)
    );
    profitByBucket.set(
      bucketKey,
      roundCurrency((profitByBucket.get(bucketKey) ?? 0) + sale.totalAmount)
    );

    totalSold = roundCurrency(totalSold + sale.totalAmount);
    totalCosts = roundCurrency(totalCosts + saleCosts);
    completedSalesCount += 1;
  }

  for (const item of saleItems) {
    if (
      item.status !== "completed" ||
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

    profitByBucket.set(
      bucketKey,
      roundCurrency((profitByBucket.get(bucketKey) ?? 0) - itemCost)
    );
    totalCosts = roundCurrency(totalCosts + itemCost);
  }

  const performance: SalesPerformancePoint[] = buckets.map((bucket) => ({
    label: bucket.label,
    profit: profitByBucket.get(bucket.key) ?? 0,
    sold: soldByBucket.get(bucket.key) ?? 0,
  }));
  const totalProfit = roundCurrency(totalSold - totalCosts);
  const averageTicket =
    completedSalesCount > 0
      ? roundCurrency(totalSold / completedSalesCount)
      : 0;
  const paymentMethods = buildPaymentMethods(
    sales.filter((sale) =>
      isDateInRange({
        date: sale.occurredOn,
        endInclusive: range.to,
        startInclusive: range.from,
      })
    )
  );
  const profitMarginPercent =
    totalSold > 0 ? roundCurrency((totalProfit / totalSold) * 100) : 0;

  return {
    averageTicket,
    cancelledSalesCount,
    completedSalesCount,
    paymentMethods,
    periodGranularity: granularity,
    performance,
    profitMarginPercent,
    totalProfit,
    totalSold,
    topPaymentMethod: paymentMethods[0]?.paymentMethod ?? null,
  };
};
