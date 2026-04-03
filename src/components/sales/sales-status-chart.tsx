"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { SalesStatusSummary } from "@/features/sales/contracts";

const STATUS_COLORS = {
  cancelled: "var(--chart-5)",
  completed: "var(--chart-2)",
} as const;

const STATUS_LABELS = {
  cancelled: "Canceladas",
  completed: "Concluidas",
} as const;

export function SalesStatusChart({ data }: { data: SalesStatusSummary[] }) {
  const hasData = data.some((item) => item.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem vendas no periodo para exibir status.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    count: item.count,
    fill: STATUS_COLORS[item.status],
    status: item.status,
  }));
  const chartConfig = chartData.reduce<ChartConfig>((config, item) => {
    config[item.status] = {
      color: STATUS_COLORS[item.status],
      label: STATUS_LABELS[item.status],
    };

    return config;
  }, {});

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {chartConfig[String(name)]?.label ?? name}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {Number(value)} venda(s)
                  </span>
                </div>
              )}
              nameKey="status"
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="count"
          innerRadius={44}
          isAnimationActive={true}
          nameKey="status"
          outerRadius={68}
          paddingAngle={3}
          strokeWidth={4}
        >
          {chartData.map((item) => (
            <Cell fill={item.fill} key={item.status} />
          ))}
        </Pie>
        <ChartLegend
          content={
            <ChartLegendContent
              className="flex-wrap gap-2 pt-2 text-[11px]"
              nameKey="status"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
