"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
} from "@/components/kibo-ui/contribution-graph";
import { Card, CardContent } from "@/components/ui/card";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 text-center text-muted-foreground text-sm">
            Sem dados suficientes para montar o mapa no periodo.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col justify-center", className)}>
      <CardContent className="flex flex-col">
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
                              dayIndex={dayIndex}
                              weekIndex={weekIndex}
                            />
                          </g>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs" side="top">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{longDate}</span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(sold)}
                            </span>
                            <span className="text-muted-foreground">
                              {salesCount}{" "}
                              {salesCount === 1 ? "venda" : "vendas"}
                            </span>
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
