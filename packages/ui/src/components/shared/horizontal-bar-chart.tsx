"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../lib/formatters";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export interface HorizontalBarChartData {
  categoryKey: string;
  categoryName: string;
  fill: string;
  value: number;
}

export interface HorizontalBarChartProps {
  config: ChartConfig;
  data: HorizontalBarChartData[];
  emptyMessage?: React.ReactNode;
  formatType?: "currency" | "number";
}

export function HorizontalBarChart({
  config,
  data,
  emptyMessage,
  formatType = "currency",
}: HorizontalBarChartProps) {
  if (data.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  return (
    <ChartContainer className="h-48 w-full" config={config}>
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <YAxis
          axisLine={false}
          dataKey="categoryName"
          tickFormatter={(value) =>
            value.length > 15 ? `${value.slice(0, 15)}...` : value
          }
          tickLine={false}
          tickMargin={10}
          type="category"
          width={100}
        />
        <XAxis dataKey="value" hide type="number" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, props) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {props.payload.categoryName}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {formatType === "currency"
                      ? formatCurrency(Number(value))
                      : Number(value)}
                  </span>
                </div>
              )}
              hideLabel
            />
          }
          cursor={false}
        />
        <Bar dataKey="value" isAnimationActive={true} radius={4}>
          {data.map((item) => (
            <Cell fill={item.fill} key={item.categoryKey} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
