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
import type { DashboardMonthlyComparisonPoint } from "@/features/dashboard/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  result: {
    color: "var(--chart-2)",
    label: "Resultado",
  },
  revenue: {
    color: "var(--chart-1)",
    label: "Faturamento",
  },
} satisfies ChartConfig;

const getSeriesLabel = (name: number | string | undefined) => {
  if (name === "revenue") {
    return chartConfig.revenue.label;
  }

  if (name === "result") {
    return chartConfig.result.label;
  }

  return String(name);
};

export function RevenueResultChart({
  data,
}: {
  data: DashboardMonthlyComparisonPoint[];
}) {
  const hasData = data.some((point) => point.revenue > 0 || point.result !== 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem vendas concluidas nos ultimos 6 meses para comparar faturamento e
        resultado.
      </div>
    );
  }

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="monthLabel"
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
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
        <Bar dataKey="result" fill="var(--color-result)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}
