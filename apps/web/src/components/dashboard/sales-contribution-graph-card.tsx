"use client";

import { Calendar02Icon } from "@hugeicons/core-free-icons";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
} from "@polaris/ui/components/shared/contribution-graph";
import { useContainerWidth } from "@polaris/ui/hooks/use-container-width";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DashboardContributionGraph } from "@/features/dashboard/contracts";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Tamanho e margem de cada célula do contribution graph.
 * Devem corresponder às props passadas ao ContributionGraph.
 */
const BLOCK_SIZE = 11;
const BLOCK_MARGIN = 3;
const CELL_STEP = BLOCK_SIZE + BLOCK_MARGIN; // 14px por coluna (semana)

const levelBandLabel = (level: number) => {
  switch (level) {
    case 0: {
      return "Sem vendas";
    }
    case 1: {
      return "Ate R$ 100";
    }
    case 2: {
      return "R$ 101 a R$ 299";
    }
    case 3: {
      return "R$ 300 ou mais";
    }
    default: {
      return "";
    }
  }
};

interface SalesContributionGraphCardProps {
  className?: string;
  graph: DashboardContributionGraph;
}

export function SalesContributionGraphCard({
  graph,
  className,
}: SalesContributionGraphCardProps) {
  const { containerRef, containerWidth } = useContainerWidth();

  /**
   * Recorta os dados do gráfico para caber na largura disponível.
   *
   * Fórmula:
   *   maxWeeks = floor((containerWidth + BLOCK_MARGIN) / CELL_STEP)
   *   maxDays  = maxWeeks * 7 - 6   (desconta até 6 dias de padding do weekStart)
   *
   * Sempre mostra os dados mais recentes (slice pelo final).
   */
  const visibleData = useMemo(() => {
    if (containerWidth === null || graph.days.length === 0) {
      return null;
    }

    const maxWeeks = Math.max(
      1,
      Math.floor((containerWidth + BLOCK_MARGIN) / CELL_STEP)
    );
    const maxDays = maxWeeks * 7 - 6;
    const days =
      graph.days.length > maxDays ? graph.days.slice(-maxDays) : graph.days;

    const byDate = new Map(days.map((day) => [day.date, day]));

    const activities = days.map((day) => ({
      count: day.salesCount,
      date: day.date,
      level: day.level,
    }));

    let totalSalesCount = 0;
    for (const day of days) {
      totalSalesCount += day.salesCount;
    }

    return { activities, byDate, totalSalesCount };
  }, [containerWidth, graph.days]);

  if (graph.days.length === 0) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardContent className="flex flex-1 items-center justify-center pt-0">
          <Empty
            className="h-48 border-dashed shadow-none"
            description="Nao ha vendas suficientes para exibir a contribuicao."
            icon={Calendar02Icon}
            title="Sem dados suficientes"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col justify-center", className)}>
      <CardContent className="flex flex-col gap-2.5">
        <div className="w-full" ref={containerRef}>
          {visibleData && visibleData.activities.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <ContributionGraph
                blockMargin={BLOCK_MARGIN}
                blockSize={BLOCK_SIZE}
                data={visibleData.activities}
                fontSize={12}
                labels={{
                  legend: { less: "Menos", more: "Mais" },
                }}
                maxLevel={3}
                totalCount={visibleData.totalSalesCount}
                weekStart={1}
              >
                <ContributionGraphCalendar className="overflow-x-hidden">
                  {({ activity, dayIndex, weekIndex }) => {
                    const day = visibleData.byDate.get(activity.date);
                    const sold = day?.sold ?? 0;
                    const salesCount = day?.salesCount ?? 0;
                    const longDate = format(
                      parseISO(`${activity.date}T12:00:00`),
                      "PPP",
                      {
                        locale: ptBR,
                      }
                    );

                    return (
                      <Tooltip key={activity.date}>
                        <TooltipTrigger asChild>
                          <g>
                            <ContributionGraphBlock
                              activity={activity}
                              aria-label={`${longDate}: ${formatCurrency(sold)}, ${salesCount} vendas, ${levelBandLabel(activity.level)}`}
                              className="transition-opacity hover:opacity-80"
                              dayIndex={dayIndex}
                              weekIndex={weekIndex}
                            />
                          </g>
                        </TooltipTrigger>
                        <TooltipContent
                          align="center"
                          className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-foreground text-xs/relaxed [&>svg]:hidden"
                          collisionPadding={12}
                          hideArrow
                          side="top"
                          sideOffset={8}
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="font-medium">{longDate}</span>
                            <div className="flex items-center justify-between gap-4 leading-none">
                              <span className="text-muted-foreground">
                                Total vendido
                              </span>
                              <span className="font-medium font-mono tabular-nums">
                                {formatCurrency(sold)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 leading-none">
                              <span className="text-muted-foreground">
                                Vendas
                              </span>
                              <span className="font-medium font-mono tabular-nums">
                                {salesCount}
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }}
                </ContributionGraphCalendar>
              </ContributionGraph>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
