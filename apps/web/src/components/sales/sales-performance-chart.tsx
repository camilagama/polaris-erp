"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { SalesPerformancePoint } from "@/features/sales/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  sold: {
    color: "var(--chart-1)",
    label: "Faturamento",
  },
} satisfies ChartConfig;

export function SalesPerformanceChart({
  data,
}: {
  data: SalesPerformancePoint[];
}) {
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
        <Area
          dataKey="sold"
          fill="url(#salesSoldGradient)"
          fillOpacity={1}
          isAnimationActive={true}
          stroke="var(--color-sold)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
