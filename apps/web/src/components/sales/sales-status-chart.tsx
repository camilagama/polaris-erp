"use client";

import { ShoppingBag02Icon } from "@hugeicons/core-free-icons";
import { DonutChart } from "@polaris/ui/components/shared/donut-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";
import { Empty } from "@polaris/ui/components/ui/empty";
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
      <Empty
        className="h-56 border-dashed shadow-none"
        description="Aguardando registros de vendas para exibir o status."
        icon={ShoppingBag02Icon}
        title="Sem vendas no periodo"
      />
    );
  }

  const chartData = data.map((item) => ({
    fill: STATUS_COLORS[item.status],
    labelKey: item.status,
    value: item.count,
  }));
  const chartConfig = chartData.reduce<ChartConfig>((config, item) => {
    const key = item.labelKey as keyof typeof STATUS_LABELS;
    config[key] = {
      color: STATUS_COLORS[key],
      label: STATUS_LABELS[key],
    };

    return config;
  }, {});

  return (
    <DonutChart
      config={chartConfig}
      data={chartData}
      emptyMessage={
        <Empty
          className="h-56 border-dashed shadow-none"
          description="Aguardando registros de vendas para exibir o status."
          icon={ShoppingBag02Icon}
          title="Sem vendas no periodo"
        />
      }
      formatTooltipValue={(value) => `${value} venda(s)`}
    />
  );
}
