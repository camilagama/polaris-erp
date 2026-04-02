"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ProductSalesPoint } from "@/features/products/contracts";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

const chartConfig = {
  quantitySold: {
    color: "var(--chart-3)",
    label: "Unidades vendidas",
  },
  soldAmount: {
    color: "var(--chart-1)",
    label: "Valor vendido",
  },
} satisfies ChartConfig;

export function ProductSalesChart({
  data,
  emptyLabel,
}: {
  data: ProductSalesPoint[];
  emptyLabel: string;
}) {
  const hasData = data.some(
    (point) => point.quantitySold > 0 || point.soldAmount > 0
  );

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <AreaChart accessibilityLayer data={data}>
        <defs>
          <linearGradient id="soldAmountGradient" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-soldAmount)"
              stopOpacity={0.28}
            />
            <stop
              offset="95%"
              stopColor="var(--color-soldAmount)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="quantitySoldGradient" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-quantitySold)"
              stopOpacity={0.22}
            />
            <stop
              offset="95%"
              stopColor="var(--color-quantitySold)"
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
          width={70}
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
                    {name === "quantitySold"
                      ? `${Number(value)} un.`
                      : formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="gap-3 pt-2" />} />
        <Area
          dataKey="soldAmount"
          fill="url(#soldAmountGradient)"
          fillOpacity={1}
          stroke="var(--color-soldAmount)"
          strokeWidth={2}
          type="monotone"
        />
        <Area
          dataKey="quantitySold"
          fill="url(#quantitySoldGradient)"
          fillOpacity={1}
          stroke="var(--color-quantitySold)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
