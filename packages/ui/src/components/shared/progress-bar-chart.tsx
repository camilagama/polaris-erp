"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../lib/formatters";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export interface ProgressBarChartProps {
  config: ChartConfig;
  data: {
    actualCost: number;
    actualPercentage: number;
    actualProfit: number;
    profitPercentage: number;
  }[];
  formatType?: "currency" | "number";
}

export function ProgressBarChart({ config, data }: ProgressBarChartProps) {
  return (
    <div className="mt-1 flex flex-col gap-3">
      <ChartContainer className="h-3 w-full" config={config}>
        <BarChart
          accessibilityLayer
          data={data}
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
                          <span className="font-semibold text-foreground">
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 whitespace-nowrap text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 shrink-0 rounded-full bg-chart-6" />
          <span>Lucro ({formatCurrency(data[0]?.actualProfit ?? 0)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
          <span>Investimento ({formatCurrency(data[0]?.actualCost ?? 0)})</span>
        </div>
      </div>
    </div>
  );
}
