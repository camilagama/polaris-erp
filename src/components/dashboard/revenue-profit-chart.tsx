"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatters";

const chartConfig = {
  costs: {
    color: "var(--chart-1)",
    label: "Receita",
  },
  profit: {
    color: "var(--chart-6)",
    label: "Lucro",
  },
} satisfies ChartConfig;

export function RevenueProfitChart({
  revenue,
  profit,
}: {
  revenue: number;
  profit: number;
}) {
  const chartData = [
    {
      group: "metrics",
      costs: revenue - Math.max(0, profit),
      profit: Math.max(0, profit),
      actualProfit: profit,
      actualRevenue: revenue,
    },
  ];

  return (
    <div className="mt-2 flex flex-col gap-3">
      <ChartContainer className="h-3 w-full" config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis domain={[0, revenue]} hide type="number" />
          <YAxis dataKey="group" hide type="category" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const config = chartConfig[name as keyof typeof chartConfig];
                  const label =
                    name === "costs" ? "Recebido" : config?.label || name;
                  let displayValue = value;
                  if (name === "costs") {
                    displayValue = item.payload.actualRevenue;
                  } else if (name === "profit") {
                    displayValue = item.payload.actualProfit;
                  }
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
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium font-mono text-foreground tabular-nums">
                          {formatCurrency(Number(displayValue))}
                        </span>
                      </div>
                    </>
                  );
                }}
                hideLabel
              />
            }
            cursor={false}
          />
          <Bar
            dataKey="costs"
            fill="var(--color-costs)"
            isAnimationActive={true}
            radius={[4, 0, 0, 4]}
            stackId="a"
          />
          <Bar
            dataKey="profit"
            fill="var(--color-profit)"
            isAnimationActive={true}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-chart-1" />
          <span>Recebido ({formatCurrency(revenue)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-chart-6" />
          <span>Lucro ({formatCurrency(profit)})</span>
        </div>
      </div>
    </div>
  );
}
