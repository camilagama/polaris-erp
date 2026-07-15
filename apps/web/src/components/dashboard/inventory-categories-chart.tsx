"use client";

import { PackageOpenIcon } from "@hugeicons/core-free-icons";
import { HorizontalBarChart } from "@polaris/ui/components/shared/horizontal-bar-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";
import { Empty } from "@/components/ui/empty";
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
  const emptyMessage = (
    <Empty
      className="h-48 border-dashed shadow-none"
      description="O valor do estoque aparecera aqui quando houver produtos."
      icon={PackageOpenIcon}
      title="Sem estoque"
    />
  );

  const MAX_CATEGORIES = 6;
  const displayData =
    data.length > MAX_CATEGORIES
      ? [
          ...data.slice(0, MAX_CATEGORIES - 1),
          {
            categoryName: "Outros",
            inventoryValue: data
              .slice(MAX_CATEGORIES - 1)
              .reduce((sum, item) => sum + item.inventoryValue, 0),
          },
        ]
      : data;

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
      emptyMessage={emptyMessage}
      formatType="currency"
    />
  );
}
