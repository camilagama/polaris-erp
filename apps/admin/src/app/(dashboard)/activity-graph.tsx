"use client";

import {
  formatBusinessDate,
  formatBusinessDateLabel,
  shiftBusinessDate,
} from "@polaris/date";
import {
  type Activity,
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
} from "@polaris/ui/components/shared/contribution-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@polaris/ui/components/ui/tooltip";
import { useContainerWidth } from "@polaris/ui/hooks/use-container-width";
import { useMemo } from "react";

const BLOCK_SIZE = 11;
const BLOCK_MARGIN = 3; // match web
const CELL_STEP = BLOCK_SIZE + BLOCK_MARGIN;

interface ActivityGraphProps {
  data: Activity[];
}

export function ActivityGraph({ data }: ActivityGraphProps) {
  const { containerRef, containerWidth } = useContainerWidth();

  const visibleData = useMemo(() => {
    if (containerWidth === null) {
      return null;
    }

    const maxWeeks = Math.max(
      1,
      Math.floor((containerWidth + BLOCK_MARGIN) / CELL_STEP)
    );
    const maxDays = maxWeeks * 7 - 6;
    const fallbackTo = formatBusinessDate();

    const sourceActivities =
      data.length > 0
        ? data
        : Array.from({ length: maxDays }).map((_, i) => ({
            date: shiftBusinessDate(fallbackTo, i - (maxDays - 1)),
            count: 0,
            level: 0,
          }));

    const visibleActivities =
      sourceActivities.length > maxDays
        ? sourceActivities.slice(-maxDays)
        : sourceActivities;
    const byDate = new Map(visibleActivities.map((day) => [day.date, day]));

    return { activities: visibleActivities, byDate };
  }, [containerWidth, data]);

  return (
    <div className="flex w-full justify-start" ref={containerRef}>
      {visibleData && visibleData.activities.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <ContributionGraph
            blockMargin={BLOCK_MARGIN}
            blockSize={BLOCK_SIZE}
            data={visibleData.activities}
            fontSize={12}
            labels={{
              legend: { less: "Menos", more: "Mais" },
              totalCount: "Eventos em {{year}}: {{count}}",
            }}
            maxLevel={4}
            weekStart={1}
          >
            <ContributionGraphCalendar className="overflow-x-hidden">
              {({ activity, dayIndex, weekIndex }) => {
                const day = visibleData.byDate.get(activity.date);
                const count = day?.count ?? 0;
                const longDate = formatBusinessDateLabel(activity.date, {
                  dateStyle: "long",
                });

                return (
                  <Tooltip key={activity.date}>
                    <TooltipTrigger asChild>
                      <g>
                        <ContributionGraphBlock
                          activity={activity}
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
                          <span className="text-muted-foreground">Eventos</span>
                          <span className="font-medium font-mono tabular-nums">
                            {count}
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
  );
}
