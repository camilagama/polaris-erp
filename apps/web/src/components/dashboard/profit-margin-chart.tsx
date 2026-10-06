"use client";

import { ProgressBarChart } from "@polaris/ui/components/shared/progress-bar-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";

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

  return <ProgressBarChart config={chartConfig} data={chartData} />;
}
