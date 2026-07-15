"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency } from "../../lib/formatters";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export interface AreaPerformanceChartProps {
  config: ChartConfig;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts requires any[]
  data: any[];
  formatType?: "currency" | "number";
  lines: {
    dataKey: string;
    fillOpacity?: number;
    strokeWidth?: number;
  }[];
  xAxisKey?: string;
}

export function AreaPerformanceChart({
  config,
  data,
  formatType = "currency",
  lines,
  xAxisKey = "label",
}: AreaPerformanceChartProps) {
  return (
    <ChartContainer className="h-56 w-full" config={config}>
      <AreaChart accessibilityLayer data={data}>
        <defs>
          {lines.map((line) => (
            <linearGradient
              id={`gradient-${line.dataKey}`}
              key={line.dataKey}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={`var(--color-${line.dataKey})`}
                stopOpacity={line.fillOpacity ?? 0.28}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${line.dataKey})`}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey={xAxisKey}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          allowDecimals={formatType !== "number"}
          axisLine={false}
          tickFormatter={(value) =>
            formatType === "currency"
              ? formatCompactCurrency(Number(value))
              : String(value)
          }
          tickLine={false}
          tickMargin={10}
          width={formatType === "currency" ? 70 : 52}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[String(name) as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {formatType === "currency"
                      ? formatCurrency(Number(value))
                      : `${Number(value)} un.`}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="gap-3 pt-2" />} />
        {lines.map((line) => (
          <Area
            dataKey={line.dataKey}
            fill={`url(#gradient-${line.dataKey})`}
            fillOpacity={1}
            isAnimationActive={true}
            key={line.dataKey}
            stroke={`var(--color-${line.dataKey})`}
            strokeWidth={line.strokeWidth ?? 2}
            type="monotone"
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
