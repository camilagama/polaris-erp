"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardPeriodComparisonPoint } from "@/features/dashboard/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  costs: {
    color: "var(--chart-2)",
    label: "Custos",
  },
  sold: {
    color: "var(--chart-1)",
    label: "Total vendido",
  },
} satisfies ChartConfig;

const getSeriesLabel = (name: number | string | undefined) => {
  if (name === "sold") {
    return chartConfig.sold.label;
  }

  if (name === "costs") {
    return chartConfig.costs.label;
  }

  return String(name);
};

export function RevenueResultChart({
  data,
}: {
  data: DashboardPeriodComparisonPoint[];
}) {
  const hasData = data.some((point) => point.sold > 0 || point.costs > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem dados no periodo para comparar vendas e custos.
      </div>
    );
  }

  return (
    <ChartContainer className="h-48 w-full" config={chartConfig}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatCompactCurrency(Number(value))}
          tickLine={false}
          tickMargin={10}
          width={68}
        />
        <ReferenceLine stroke="var(--border)" y={0} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {getSeriesLabel(name)}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="gap-3 pt-2" />} />
        <Bar
          dataKey="sold"
          fill="var(--color-sold)"
          isAnimationActive={true}
          radius={6}
        />
        <Bar
          dataKey="costs"
          fill="var(--color-costs)"
          isAnimationActive={true}
          radius={6}
        />
      </BarChart>
    </ChartContainer>
  );
}
