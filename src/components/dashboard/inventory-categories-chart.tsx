"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
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
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <YAxis
          axisLine={false}
          dataKey="categoryName"
          tickFormatter={(value) =>
            value.length > 15 ? `${value.slice(0, 15)}...` : value
          }
          tickLine={false}
          tickMargin={10}
          type="category"
          width={100}
        />
        <XAxis dataKey="inventoryValue" hide type="number" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, props) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {props.payload.categoryName}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
              hideLabel
            />
          }
          cursor={false}
        />
        <Bar dataKey="inventoryValue" radius={4}>
          {chartData.map((item) => (
            <Cell fill={item.fill} key={item.categoryKey} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
