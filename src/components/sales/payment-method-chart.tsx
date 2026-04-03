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
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem pagamentos concluidos no periodo.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    fill: METHOD_COLORS[item.paymentMethod],
    paymentMethod: item.paymentMethod,
    salesCount: item.salesCount,
    totalAmount: item.totalAmount,
  }));
  const chartConfig = chartData.reduce<ChartConfig>((config, item) => {
    config[item.paymentMethod] = {
      color: METHOD_COLORS[item.paymentMethod],
      label: PAYMENT_METHOD_LABELS[item.paymentMethod],
    };

    return config;
  }, {});

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
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
              nameKey="paymentMethod"
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="salesCount"
          innerRadius={44}
          isAnimationActive={true}
          nameKey="paymentMethod"
          outerRadius={68}
          paddingAngle={3}
          strokeWidth={4}
        >
          {chartData.map((item) => (
            <Cell fill={item.fill} key={item.paymentMethod} />
          ))}
        </Pie>
        <ChartLegend
          content={
            <ChartLegendContent
              className="flex-wrap gap-2 pt-2 text-[11px]"
              nameKey="paymentMethod"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
