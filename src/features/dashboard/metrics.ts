import type {
  DashboardInventoryCategory,
  DashboardMetrics,
  DashboardRestockAlert,
  DashboardResultStatus,
  DashboardTopProduct,
} from "@/features/dashboard/contracts";
import { roundCurrency } from "@/lib/domain/currency";
import { formatDateInputValue } from "@/lib/domain/date";

const RECENT_MONTHS_COUNT = 6;
const MAX_CATEGORY_SLICES = 5;
const MAX_RESTOCK_ALERTS = 5;

const MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export interface DashboardSaleRecord {
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

export interface DashboardStockEntryRecord {
  quantity: number;
  stockedOn: string;
  unitCost: number;
}

export interface DashboardInventoryRecord {
  categoryName: string;
  inventoryValue: number;
}

export interface DashboardProductRecord {
  archivedAt: Date | null;
  id: string;
  name: string;
  stock: number;
}

export interface DashboardDateRange {
  comparisonStart: string;
  currentMonthKey: string;
  currentMonthLabel: string;
  currentMonthStart: string;
  nextMonthStart: string;
  recentMonthKeys: string[];
}

interface BuildDashboardMetricsInput {
  inventory: DashboardInventoryRecord[];
  products: DashboardProductRecord[];
  referenceDate?: Date;
  saleItems: DashboardSaleItemRecord[];
  sales: DashboardSaleRecord[];
  stockEntries: DashboardStockEntryRecord[];
}

const buildMonthKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

const buildMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;

  return `${MONTH_LABELS[monthIndex]}/${year.slice(2)}`;
};

const isDateInRange = ({
  date,
  endExclusive,
  startInclusive,
}: {
  date: string;
  endExclusive: string;
  startInclusive: string;
}) => date >= startInclusive && date < endExclusive;

export const getDashboardDateRange = (
  referenceDate = new Date()
): DashboardDateRange => {
  const currentMonthStartDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const nextMonthStartDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1
  );
  const comparisonStartDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - (RECENT_MONTHS_COUNT - 1),
    1
  );

  const recentMonthKeys = Array.from(
    { length: RECENT_MONTHS_COUNT },
    (_, index) => {
      const monthDate = new Date(
        comparisonStartDate.getFullYear(),
        comparisonStartDate.getMonth() + index,
        1
      );

      return buildMonthKey(monthDate.getFullYear(), monthDate.getMonth());
    }
  );
  const currentMonthKey = buildMonthKey(
    currentMonthStartDate.getFullYear(),
    currentMonthStartDate.getMonth()
  );

  return {
    comparisonStart: formatDateInputValue(comparisonStartDate),
    currentMonthKey,
    currentMonthLabel: buildMonthLabel(currentMonthKey),
    currentMonthStart: formatDateInputValue(currentMonthStartDate),
    nextMonthStart: formatDateInputValue(nextMonthStartDate),
    recentMonthKeys,
  };
};

const getResultStatus = (value: number): DashboardResultStatus => {
  if (value > 0) {
    return "profit";
  }

  if (value < 0) {
    return "loss";
  }

  return "breakEven";
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

const buildRestockAlerts = (
  products: DashboardProductRecord[]
): DashboardRestockAlert[] =>
  products
    .filter((product) => !product.archivedAt && product.stock <= 2)
    .sort(
      (left, right) =>
        Number(left.stock > 0) - Number(right.stock > 0) ||
        left.stock - right.stock ||
        left.name.localeCompare(right.name, "pt-BR")
    )
    .slice(0, MAX_RESTOCK_ALERTS)
    .map((product) => ({
      id: product.id,
      name: product.name,
      severity: product.stock === 0 ? "critical" : "low",
      stock: product.stock,
    }));

const buildTopProducts = ({
  currentMonthStart,
  nextMonthStart,
  saleItems,
}: {
  currentMonthStart: string;
  nextMonthStart: string;
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
        endExclusive: nextMonthStart,
        startInclusive: currentMonthStart,
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

export const buildDashboardMetrics = ({
  inventory,
  products,
  referenceDate = new Date(),
  saleItems,
  sales,
  stockEntries,
}: BuildDashboardMetricsInput): DashboardMetrics => {
  const {
    comparisonStart,
    currentMonthKey,
    currentMonthLabel,
    currentMonthStart,
    nextMonthStart,
    recentMonthKeys,
  } = getDashboardDateRange(referenceDate);

  const revenueByMonth = new Map<string, number>();
  const costByMonth = new Map<string, number>();

  for (const sale of sales) {
    if (sale.status !== "completed") {
      continue;
    }

    if (
      !isDateInRange({
        date: sale.occurredOn,
        endExclusive: nextMonthStart,
        startInclusive: comparisonStart,
      })
    ) {
      continue;
    }

    const monthKey = sale.occurredOn.slice(0, 7);
    const currentRevenue = revenueByMonth.get(monthKey) ?? 0;
    revenueByMonth.set(
      monthKey,
      roundCurrency(currentRevenue + sale.totalAmount)
    );
  }

  for (const item of saleItems) {
    if (item.status !== "completed") {
      continue;
    }

    if (
      !isDateInRange({
        date: item.occurredOn,
        endExclusive: nextMonthStart,
        startInclusive: comparisonStart,
      })
    ) {
      continue;
    }

    const monthKey = item.occurredOn.slice(0, 7);
    const currentCost = costByMonth.get(monthKey) ?? 0;
    const itemCost = item.quantity * item.unitCostSnapshot;

    costByMonth.set(monthKey, roundCurrency(currentCost + itemCost));
  }

  const monthlyComparison = recentMonthKeys.map((monthKey) => {
    const revenue = revenueByMonth.get(monthKey) ?? 0;
    const result = roundCurrency(revenue - (costByMonth.get(monthKey) ?? 0));

    return {
      monthKey,
      monthLabel: buildMonthLabel(monthKey),
      revenue,
      result,
    };
  });

  const currentMonthMetrics =
    monthlyComparison.find((point) => point.monthKey === currentMonthKey) ??
    null;
  const monthlyRestockInvestment = roundCurrency(
    stockEntries.reduce((acc, entry) => {
      if (
        !isDateInRange({
          date: entry.stockedOn,
          endExclusive: nextMonthStart,
          startInclusive: currentMonthStart,
        })
      ) {
        return acc;
      }

      return acc + entry.quantity * entry.unitCost;
    }, 0)
  );

  return {
    criticalStockCount: products.filter(
      (product) => !product.archivedAt && product.stock === 0
    ).length,
    inventoryByCategory: buildInventoryByCategory(inventory),
    monthlyComparison,
    monthlyRestockInvestment,
    monthlyResult: currentMonthMetrics?.result ?? 0,
    monthlyRevenue: currentMonthMetrics?.revenue ?? 0,
    referenceMonthKey: currentMonthKey,
    referenceMonthLabel: currentMonthLabel,
    restockAlerts: buildRestockAlerts(products),
    resultStatus: getResultStatus(currentMonthMetrics?.result ?? 0),
    topProducts: buildTopProducts({
      currentMonthStart,
      nextMonthStart,
      saleItems,
    }),
  };
};
