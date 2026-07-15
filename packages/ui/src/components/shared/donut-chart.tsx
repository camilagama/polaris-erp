"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

export interface DonutChartProps {
  config: ChartConfig;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts payload
  customTooltipRenderer?: (value: any, name: any, item: any) => React.ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts payload
  data: any[];
  emptyMessage?: React.ReactNode;
  formatTooltipValue?: (value: number) => string;
}

export function DonutChart({
  config,
  data,
  emptyMessage,
  formatTooltipValue,
  customTooltipRenderer,
}: DonutChartProps) {
  const hasData = data.some((item) => item.value > 0);

  if (!hasData && emptyMessage) {
    return emptyMessage;
  }

  return (
    <ChartContainer className="h-56 w-full" config={config}>
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                if (customTooltipRenderer) {
                  return customTooltipRenderer(value, name, item);
                }
                return (
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[String(name)]?.label ?? name}
                    </span>
                    <span className="font-medium font-mono text-foreground">
                      {formatTooltipValue
                        ? formatTooltipValue(Number(value))
                        : Number(value)}
                    </span>
                  </div>
                );
              }}
              nameKey="labelKey"
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          innerRadius={44}
          isAnimationActive={true}
          nameKey="labelKey"
          outerRadius={68}
          paddingAngle={3}
          strokeWidth={4}
        >
          {data.map((item) => (
            <Cell fill={item.fill} key={item.labelKey} />
          ))}
        </Pie>
        <ChartLegend
          content={
            <ChartLegendContent
              className="flex-wrap gap-2 pt-2 text-[11px]"
              nameKey="labelKey"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
