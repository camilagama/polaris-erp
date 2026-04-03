"use client";

import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

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
    label: "Lucro Líquido",
  },
} satisfies ChartConfig;

export function RevenueProfitChart({
  revenue,
  profit,
}: {
  revenue: number;
  profit: number;
}) {
  const percentage = revenue > 0 ? (Math.max(0, profit) / revenue) * 100 : 0;

  const chartData = [
    {
      name: "metrics",
      profit: Math.max(0, profit),
      fill: "var(--color-profit)",
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-[10px] text-muted-foreground uppercase leading-none tracking-[0.14em]">
          Receita / Lucro
        </span>
        <div className="flex flex-col gap-1.5">
          <strong className="font-heading text-[1.65rem] leading-none tracking-tight">
            {formatCurrency(revenue)}
          </strong>
          <span className="font-heading font-medium text-[1.12rem] text-muted-foreground tabular-nums leading-none tracking-tight">
            {formatCurrency(profit)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <ChartContainer className="size-[92px] shrink-0" config={chartConfig}>
          <RadialBarChart
            data={chartData}
            endAngle={-270}
            innerRadius={34}
            outerRadius={44}
            startAngle={90}
          >
            <PolarAngleAxis
              angleAxisId={0}
              domain={[0, Math.max(revenue, 1)]}
              tick={false}
              type="number"
            />
            <RadialBar
              background={{
                className: "fill-muted hover:fill-muted transition-colors",
              }}
              cornerRadius={10}
              dataKey="profit"
              isAnimationActive={true}
            />
            <PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-foreground font-semibold text-[14px] tabular-nums"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          {percentage.toFixed(0)}%
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-32 -translate-x-full"
                  formatter={(value) => (
                    <>
                      <div className="size-2.5 shrink-0 rounded-[2px] bg-chart-6" />
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="font-heading font-medium tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </div>
                    </>
                  )}
                  hideLabel
                />
              }
              cursor={false}
            />
          </RadialBarChart>
        </ChartContainer>

        <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground">
          <div className="size-1.5 shrink-0 rounded-full bg-chart-6" />
          <span>Lucro no período</span>
        </div>
      </div>
    </div>
  );
}
