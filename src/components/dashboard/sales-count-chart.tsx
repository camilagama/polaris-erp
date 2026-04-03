"use client";

import { Area, AreaChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardPeriodComparisonPoint } from "@/features/dashboard/contracts";

const chartConfig = {
  salesCount: {
    color: "var(--chart-6)",
    label: "Vendas",
  },
} satisfies ChartConfig;

export function SalesCountChart({
  data,
}: {
  data: DashboardPeriodComparisonPoint[];
}) {
  return (
    <div className="h-full w-full">
      <ChartContainer className="h-full w-full" config={chartConfig}>
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
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
            content={<ChartTooltipContent indicator="line" />}
            cursor={{
              opacity: 0.5,
              stroke: "var(--muted-foreground)",
              strokeDasharray: "3 3",
              strokeWidth: 1,
            }}
            position={{ x: -110, y: -10 }}
          />

          <Area
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
