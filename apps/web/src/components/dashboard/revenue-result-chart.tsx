"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@polaris/ui/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPeriodComparisonPoint } from "@/features/dashboard/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  costs: {
    color: "var(--chart-1)",
    label: "Custos",
  },
  result: {
    color: "var(--chart-6)",
    label: "Lucro",
  },
  sold: {
    color: "var(--chart-5)",
    label: "Total vendido",
  },
} satisfies ChartConfig;

export function RevenueResultChart({
  data,
}: {
  data: DashboardPeriodComparisonPoint[];
}) {
  return (
    <ChartContainer className="h-48 w-full" config={chartConfig}>
      <AreaChart accessibilityLayer data={data}>
        <defs>
          <linearGradient id="fillSold" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sold)" stopOpacity={0.8} />
            <stop
              offset="95%"
              stopColor="var(--color-sold)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillCosts" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-costs)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-costs)"
              stopOpacity={0.1}
            />
          </linearGradient>
          <linearGradient id="fillResult" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-result)"
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor="var(--color-result)"
              stopOpacity={0.1}
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
              formatter={(value, name, item) => {
                const config = chartConfig[name as keyof typeof chartConfig];
                return (
                  <>
                    <div
                      className="size-2.5 shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]"
                      style={
                        {
                          "--color-bg": config?.color || item.color,
                          "--color-border": config?.color || item.color,
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                      <span className="text-muted-foreground">
                        {config?.label || name}
                      </span>
                      <span className="font-medium font-mono text-foreground tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  </>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="gap-3 pt-2" />} />
        <Area
          dataKey="sold"
          fill="url(#fillSold)"
          fillOpacity={0.4}
          isAnimationActive={true}
          stroke="var(--color-sold)"
          type="monotone"
        />
        <Area
          dataKey="costs"
          fill="url(#fillCosts)"
          fillOpacity={0.4}
          isAnimationActive={true}
          stroke="var(--color-costs)"
          type="monotone"
        />
        <Area
          dataKey="result"
          fill="url(#fillResult)"
          fillOpacity={0.4}
          isAnimationActive={true}
          stroke="var(--color-result)"
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
