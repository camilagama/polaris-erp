"use client";

import { HorizontalBarChart } from "@polaris/ui/components/shared/horizontal-bar-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";
import type { DashboardInventoryCategory } from "@/features/dashboard/contracts";

const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "color-mix(in oklch, var(--chart-2) 55%, var(--muted-foreground) 45%)",
] as const;

export function InventoryCategoriesChart({
  data,
}: {
  data: DashboardInventoryCategory[];
}) {
  const MAX_CATEGORIES = 6;
  const rawData =
    data.length > 0
      ? data
      : [{ categoryName: "Sem estoque", inventoryValue: 0 }];

  const displayData =
    rawData.length > MAX_CATEGORIES
      ? [
          ...rawData.slice(0, MAX_CATEGORIES - 1),
          {
            categoryName: "Outros",
            inventoryValue: rawData
              .slice(MAX_CATEGORIES - 1)
              .reduce((sum, item) => sum + item.inventoryValue, 0),
          },
        ]
      : rawData;

  const chartData = displayData.map((item, index) => ({
    categoryKey: `category-${index + 1}`,
    categoryName: item.categoryName,
    fill: `var(--color-category-${index + 1})`,
    value: item.inventoryValue,
  }));

  const chartConfig = chartData.reduce<ChartConfig>((config, item, index) => {
    config[item.categoryKey] = {
      color:
        CATEGORY_COLORS[index] ?? CATEGORY_COLORS.at(-1) ?? "var(--chart-5)",
      label: item.categoryName,
    };

    return config;
  }, {});

  return (
    <HorizontalBarChart
      config={chartConfig}
      data={chartData}
      formatType="currency"
    />
  );
}
