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
  products: {
    color: "var(--chart-1)",
    label: "Produtos",
  },
  shipping: {
    color: "var(--chart-2)",
    label: "Fretes e taxas",
  },
} satisfies ChartConfig;

export function OperationalCostsChart({
  totalProductCosts,
  totalShippingAndSellerFees,
}: {
  totalProductCosts: number;
  totalShippingAndSellerFees: number;
}) {
  const chartData = [
    {
      group: "costs",
      products: totalProductCosts,
      shipping: totalShippingAndSellerFees,
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
          <XAxis
            domain={[0, totalProductCosts + totalShippingAndSellerFees]}
            hide
            type="number"
          />
          <YAxis dataKey="group" hide type="category" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, _item) => {
                  const config = chartConfig[name as keyof typeof chartConfig];
                  return (
                    <>
                      <div
                        className={`size-2.5 shrink-0 rounded-[2px] ${
                          name === "products" ? "bg-chart-1" : "bg-chart-2"
                        }`}
                      />
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="text-muted-foreground">
                          {config?.label || name}
                        </span>
                        <span className="font-heading font-medium tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
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
            dataKey="products"
            fill="var(--color-products)"
            isAnimationActive={true}
            radius={[4, 0, 0, 4]}
            stackId="a"
          />
          <Bar
            dataKey="shipping"
            fill="var(--color-shipping)"
            isAnimationActive={true}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-chart-1" />
          <span>Produtos ({formatCurrency(totalProductCosts)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-chart-2" />
          <span>
            Fretes e taxas ({formatCurrency(totalShippingAndSellerFees)})
          </span>
        </div>
      </div>
    </div>
  );
}
