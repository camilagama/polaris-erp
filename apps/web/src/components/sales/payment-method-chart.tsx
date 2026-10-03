"use client";

import { ShoppingBag02Icon } from "@hugeicons/core-free-icons";
import { DonutChart } from "@polaris/ui/components/shared/donut-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";
import { Empty } from "@polaris/ui/components/ui/empty";
import type { SalesPaymentMethodSummary } from "@/features/sales/contracts";
import { formatCurrency } from "@/lib/formatters";

const METHOD_COLORS = {
  card: "var(--chart-4)",
  pix: "var(--chart-2)",
} as const;

const PAYMENT_METHOD_LABELS = {
  card: "Cartao",
  pix: "Pix",
} as const;

export function PaymentMethodChart({
  data,
}: {
  data: SalesPaymentMethodSummary[];
}) {
  if (data.length === 0) {
    return (
      <Empty
        className="h-56 border-dashed shadow-none"
        description="Aguardando registros para exibir os metodos de pagamento."
        icon={ShoppingBag02Icon}
        title="Sem pagamentos concluidos"
      />
    );
  }

  const chartData = data.map((item) => ({
    fill: METHOD_COLORS[item.paymentMethod],
    labelKey: item.paymentMethod,
    value: item.salesCount,
    totalAmount: item.totalAmount, // Extra prop for custom tooltip
  }));
  const chartConfig = chartData.reduce<ChartConfig>((config, item) => {
    const key = item.labelKey as keyof typeof PAYMENT_METHOD_LABELS;
    config[key] = {
      color: METHOD_COLORS[key],
      label: PAYMENT_METHOD_LABELS[key],
    };

    return config;
  }, {});

  return (
    <DonutChart
      config={chartConfig}
      customTooltipRenderer={(value, name, item) => (
        <div className="grid w-full gap-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              {chartConfig[String(name)]?.label ?? name}
            </span>
            <span className="font-medium font-mono text-foreground">
              {Number(value)} venda(s)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-medium font-mono text-foreground">
              {formatCurrency(Number(item.payload?.totalAmount ?? 0))}
            </span>
          </div>
        </div>
      )}
      data={chartData}
      emptyMessage={
        <Empty
          className="h-56 border-dashed shadow-none"
          description="Aguardando registros para exibir os metodos de pagamento."
          icon={ShoppingBag02Icon}
          title="Sem pagamentos concluidos"
        />
      }
    />
  );
}
