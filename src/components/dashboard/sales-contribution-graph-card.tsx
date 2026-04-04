"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  const byDate = new Map(graph.days.map((day) => [day.date, day]));

  const activities = graph.days.map((day) => ({
    count: day.salesCount,
    date: day.date,
    level: day.level,
  }));

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardContent className="flex flex-1 flex-col justify-center gap-4 pt-4">
        <TooltipProvider delayDuration={200}>
          <ContributionGraph
            blockMargin={3}
            blockSize={11}
            data={activities}
            fontSize={12}
            labels={{
              legend: { less: "Menos", more: "Mais" },
            }}
            maxLevel={3}
            totalCount={graph.totalSalesCount}
            weekStart={1}
          >
            <ContributionGraphCalendar>
              {({ activity, dayIndex, weekIndex }) => {
                const day = byDate.get(activity.date);
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
                          {salesCount} {salesCount === 1 ? "venda" : "vendas"}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }}
            </ContributionGraphCalendar>
          </ContributionGraph>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
