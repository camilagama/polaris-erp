"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardInventoryCategory } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";

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
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem estoque para distribuir por categoria.
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    categoryKey: `category-${index + 1}`,
    categoryName: item.categoryName,
    fill: `var(--color-category-${index + 1})`,
    inventoryValue: item.inventoryValue,
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
    <ChartContainer className="h-48 w-full" config={chartConfig}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {chartConfig[String(name)]?.label ?? name}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
              nameKey="categoryKey"
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="inventoryValue"
          innerRadius={44}
          nameKey="categoryKey"
          outerRadius={68}
          paddingAngle={2}
          strokeWidth={4}
        >
          {chartData.map((item) => (
            <Cell fill={item.fill} key={item.categoryKey} />
          ))}
        </Pie>
        <ChartLegend
          content={
            <ChartLegendContent
              className="flex-wrap gap-2 pt-2 text-[11px]"
              nameKey="categoryKey"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
