"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import type { DashboardTopProduct } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";

const chartConfig = {
  quantitySold: {
    color: "var(--chart-3)",
    label: "Unidades vendidas",
  },
} satisfies ChartConfig;

const truncateLabel = (value: string) =>
  value.length > 18 ? `${value.slice(0, 18)}...` : value;

function TopProductsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DashboardTopProduct }>;
}) {
  const product = payload?.[0]?.payload;

  if (!(active && product)) {
    return null;
  }

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <div className="font-medium">{product.name}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Unidades</span>
        <span className="font-medium font-mono">{product.quantitySold}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Valor vendido</span>
        <span className="font-medium font-mono">
          {formatCurrency(product.soldAmount)}
        </span>
      </div>
    </div>
  );
}

export function TopProductsChart({ data }: { data: DashboardTopProduct[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
        Sem vendas concluidas neste periodo para montar o ranking de produtos.
      </div>
    );
  }

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          axisLine={false}
          dataKey="name"
          tickFormatter={truncateLabel}
          tickLine={false}
          tickMargin={8}
          type="category"
          width={120}
        />
        <XAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          type="number"
        />
        <ChartTooltip content={<TopProductsTooltip />} cursor={false} />
        <Bar
          dataKey="quantitySold"
          fill="var(--color-quantitySold)"
          radius={6}
        />
      </BarChart>
    </ChartContainer>
  );
}
