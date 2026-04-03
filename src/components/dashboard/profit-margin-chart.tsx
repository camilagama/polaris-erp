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
  profit: {
    color: "var(--chart-6)",
    label: "Lucro total",
  },
  cost: {
    color: "var(--muted)",
    label: "Investimento total",
  },
} satisfies ChartConfig;

export function ProfitMarginChart({
  cost,
  profit,
}: {
  cost: number;
  profit: number;
}) {
  const profitPercentage = cost > 0 ? (profit / cost) * 100 : 0;

  const chartData = [
    {
      group: "margin",
      // We cap the displayed percentage visually at 100%, but tooltip can show actual values
      profitPercentage: Math.min(100, Math.max(0, profitPercentage)),
      actualProfit: profit,
      actualCost: cost,
      actualPercentage: profitPercentage,
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
          <XAxis domain={[0, 100]} hide type="number" />
          <YAxis dataKey="group" hide type="category" />

          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_value, _name, item) => {
                  const actualPercentage = item.payload.actualPercentage;
                  const actualProfit = item.payload.actualProfit;

                  return (
                    <>
                      <div className="size-2.5 shrink-0 rounded-[2px] bg-chart-6" />
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="text-muted-foreground">Progresso</span>
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <span className="font-medium text-foreground">
                            {actualPercentage.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground">
                            ({formatCurrency(actualProfit)})
                          </span>
                        </div>
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
            background={{ fill: "var(--secondary)", radius: 4 }}
            dataKey="profitPercentage"
            fill="var(--color-profit)"
            isAnimationActive={true}
            radius={4}
          />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-chart-6" />
          <span>Lucro ({formatCurrency(profit)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-muted-foreground/30" />
          <span>Investimento ({formatCurrency(cost)})</span>
        </div>
      </div>
    </div>
  );
}
