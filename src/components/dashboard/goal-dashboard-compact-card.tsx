"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardGoalCard } from "@/features/goals/contracts";
import { formatCurrency } from "@/lib/formatters";

const chartConfig = {
  progress: {
    color: "var(--chart-6)",
    label: "Progresso",
  },
} satisfies ChartConfig;

const formatGoalAmount = (
  metric: DashboardGoalCard["metric"],
  value: number
): string =>
  metric === "sales_count" ? `${Math.round(value)}` : formatCurrency(value);

export function GoalDashboardCompactCard({
  goal,
}: {
  goal: DashboardGoalCard;
}) {
  const chartData = [
    {
      actualPercentage: goal.progressPercent,
      barPercent: goal.barPercent,
      group: "goal",
    },
  ];

  const periodLabel = `${format(
    parseISO(`${goal.period.from}T12:00:00`),
    "dd/MM/yy",
    {
      locale: ptBR,
    }
  )} — ${format(parseISO(`${goal.period.to}T12:00:00`), "dd/MM/yy", {
    locale: ptBR,
  })}`;

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="font-medium text-[10px] text-muted-foreground uppercase leading-none tracking-[0.14em]">
          <span className="line-clamp-2">{goal.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 pt-0">
        <strong className="font-mono text-2xl tabular-nums leading-none tracking-tight">
          {goal.progressPercent.toFixed(1)}%
        </strong>
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
                    const actualPercentage = item.payload.actualPercentage;

                    return (
                      <>
                        <div className="size-2.5 shrink-0 rounded-[2px] bg-chart-6" />
                        <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                          <span className="text-muted-foreground">
                            Progresso
                          </span>
                          <span className="font-heading font-semibold text-foreground tabular-nums">
                            {actualPercentage.toFixed(1)}%
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
              background={{ fill: "var(--secondary)", radius: 4 }}
              dataKey="barPercent"
              fill="var(--color-progress)"
              isAnimationActive={true}
              radius={4}
            />
          </BarChart>
        </ChartContainer>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 whitespace-nowrap text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 shrink-0 rounded-full bg-chart-6" />
            <span>
              Atual ({formatGoalAmount(goal.metric, goal.actualValue)})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
            <span>
              Meta ({formatGoalAmount(goal.metric, goal.targetValue)})
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/90">
          Periodo: {periodLabel}
        </span>
      </CardContent>
    </Card>
  );
}
