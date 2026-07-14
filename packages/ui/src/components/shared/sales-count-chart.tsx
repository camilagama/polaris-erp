"use client";

import { Area, AreaChart, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export interface SalesCountChartDataPoint {
  costs: number;
  label: string;
  result: number;
  salesCount: number;
  sold: number;
}

const chartConfig = {
  salesCount: {
    color: "var(--chart-6)",
    label: "Vendas",
  },
} satisfies ChartConfig;

export function SalesCountChart({
  data,
}: {
  data: SalesCountChartDataPoint[];
}) {
  return (
    <div className="h-full w-full">
      <ChartContainer className="h-full w-full" config={chartConfig}>
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 6, right: 8, bottom: 4, left: 8 }}
        >
          <YAxis
            allowDecimals={false}
            domain={[
              (dataMin: number) => Math.max(0, dataMin - 1),
              (dataMax: number) => dataMax + 1,
            ]}
            hide
            type="number"
          />

          <defs>
            <linearGradient id="fillSales" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-salesCount)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-salesCount)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>

          <ChartTooltip
            content={<ChartTooltipContent hideLabel />}
            cursor={{
              opacity: 0.5,
              stroke: "var(--muted-foreground)",
              strokeDasharray: "3 3",
              strokeWidth: 1,
            }}
          />

          <Area
            activeDot={{ r: 3.5 }}
            dataKey="salesCount"
            fill="url(#fillSales)"
            fillOpacity={0.4}
            stroke="var(--color-salesCount)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
