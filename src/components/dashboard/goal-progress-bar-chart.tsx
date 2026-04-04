"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { GoalDisplayMode, GoalMetric } from "@/features/goals/contracts";
import { formatCurrency } from "@/lib/formatters";

const chartConfig = {
  progress: {
    color: "var(--chart-6)",
    label: "Progresso",
  },
} satisfies ChartConfig;

const metricShortLabel = (metric: GoalMetric): string => {
  switch (metric) {
    case "profit": {
      return "Lucro operacional";
    }
    case "revenue": {
      return "Receita";
    }
    case "sales_count": {
      return "Vendas concluidas";
    }
    default: {
      throw new Error("Metric de meta desconhecido.");
    }
  }
};

const formatActualTarget = (metric: GoalMetric, value: number): string => {
  if (metric === "sales_count") {
    return `${Math.round(value)}`;
  }

  if (metric === "revenue" || metric === "profit") {
    return formatCurrency(value);
  }

  throw new Error("Metric de meta desconhecido.");
};

export function GoalProgressBarChart({
  actualValue,
  barPercent,
  displayMode,
  metric,
  progressPercent,
  targetValue,
}: {
  actualValue: number;
  barPercent: number;
  displayMode: GoalDisplayMode;
  metric: GoalMetric;
  progressPercent: number;
  targetValue: number;
}) {
  const chartData = [
    {
      actualValue,
      barPercent: Math.min(100, Math.max(0, barPercent)),
      group: "goal",
      progressPercent,
      targetValue,
    },
  ];

  const primaryLabel =
    displayMode === "percentage"
      ? `${progressPercent.toFixed(1)}% da meta`
      : `${formatActualTarget(metric, actualValue)} de ${formatActualTarget(metric, targetValue)}`;

  return (
    <div className="mt-1 flex flex-col gap-2">
      <ChartContainer className="h-3 w-full" config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
        >
          <XAxis domain={[0, 100]} hide type="number" />
          <YAxis dataKey="group" hide type="category" />

          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_value, _name, item) => {
                  const payload = item.payload as {
                    actualValue: number;
                    progressPercent: number;
                    targetValue: number;
                  };

                  return (
                    <>
                      <div className="size-2.5 shrink-0 rounded-[2px] bg-chart-6" />
                      <div className="flex flex-1 flex-col gap-1 leading-none">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Progresso
                          </span>
                          <span className="font-mono font-semibold text-foreground tabular-nums">
                            {payload.progressPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
                          <span>Atual</span>
                          <span className="font-mono tabular-nums">
                            {formatActualTarget(metric, payload.actualValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
                          <span>Meta</span>
                          <span className="font-mono tabular-nums">
                            {formatActualTarget(metric, payload.targetValue)}
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
            dataKey="barPercent"
            fill="var(--color-progress)"
            isAnimationActive={true}
            radius={4}
          />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground">{primaryLabel}</span>
        <span className="text-muted-foreground/80">
          {metricShortLabel(metric)}
        </span>
      </div>
    </div>
  );
}
