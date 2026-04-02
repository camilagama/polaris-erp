"use client";

import {
  Area,
  AreaChart,
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
import type { SalesPerformancePoint } from "@/features/sales/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  profit: {
    color: "var(--chart-2)",
    label: "Lucro",
  },
  sold: {
    color: "var(--chart-1)",
    label: "Total vendido",
  },
} satisfies ChartConfig;

export function SalesPerformanceChart({
  data,
}: {
  data: SalesPerformancePoint[];
}) {
  const hasData = data.some((point) => point.sold > 0 || point.profit !== 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem vendas no periodo para exibir desempenho.
      </div>
    );
  }

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <AreaChart accessibilityLayer data={data}>
        <defs>
          <linearGradient id="salesSoldGradient" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-sold)"
              stopOpacity={0.28}
            />
            <stop offset="95%" stopColor="var(--color-sold)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="salesProfitGradient" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-profit)"
              stopOpacity={0.25}
            />
            <stop
              offset="95%"
              stopColor="var(--color-profit)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
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
                    {chartConfig[String(name) as keyof typeof chartConfig]
                      ?.label ?? name}
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
        <Area
          dataKey="sold"
          fill="url(#salesSoldGradient)"
          fillOpacity={1}
          stroke="var(--color-sold)"
          strokeWidth={2}
          type="monotone"
        />
        <Area
          dataKey="profit"
          fill="url(#salesProfitGradient)"
          fillOpacity={1}
          stroke="var(--color-profit)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
