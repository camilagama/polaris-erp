"use client";

import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildDashboardRangeQuery,
  type DashboardDatePreset,
  dashboardDatePresetOptions,
  getDashboardPresetDateRange,
} from "@/features/dashboard/date-range";
import { formatDateInputValue } from "@/lib/domain/date";
import { cn } from "@/lib/utils";

interface DashboardDateRangeFilterProps {
  from: string;
  preset: DashboardDatePreset | null;
  to: string;
}

const toDate = (value: string) => parseISO(`${value}T00:00:00`);

export function DashboardDateRangeFilter({
  from,
  preset,
  to,
}: DashboardDateRangeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: toDate(from),
    to: toDate(to),
  });

  const applyRange = ({
    from: nextFrom,
    preset: nextPreset,
    to: nextTo,
  }: {
    from: string;
    preset: DashboardDatePreset | null;
    to: string;
  }) => {
    const query = buildDashboardRangeQuery({
      from: nextFrom,
      preset: nextPreset,
      to: nextTo,
    });

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              className={cn(
                "min-w-56 justify-start text-left font-normal",
                pending && "opacity-70"
              )}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon data-icon="inline-start" icon={Calendar01Icon} />
              {format(toDate(from), "dd/MM/yyyy", {
                locale: ptBR,
              })}{" "}
              ate{" "}
              {format(toDate(to), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-1">
            <Calendar
              className="rounded-lg bg-muted/5"
              locale={ptBR}
              mode="range"
              numberOfMonths={2}
              onSelect={(rangeValue) => {
                setSelectedRange(rangeValue);

                if (!(rangeValue?.from && rangeValue.to)) {
                  return;
                }

                applyRange({
                  from: formatDateInputValue(rangeValue.from),
                  preset: null,
                  to: formatDateInputValue(rangeValue.to),
                });
                setOpen(false);
              }}
              selected={selectedRange}
            />
          </PopoverContent>
        </Popover>

        {dashboardDatePresetOptions.map((option) => (
          <Button
            disabled={pending}
            key={option.value}
            onClick={() => {
              const presetRange = getDashboardPresetDateRange(option.value);

              setSelectedRange({
                from: toDate(presetRange.from),
                to: toDate(presetRange.to),
              });
              applyRange({
                from: presetRange.from,
                preset: option.value,
                to: presetRange.to,
              });
            }}
            size="sm"
            type="button"
            variant={preset === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {searchParams.size > 0 ? (
        <p className="text-muted-foreground text-xs">
          O dashboard atualiza todos os cards e graficos com base no intervalo
          selecionado.
        </p>
      ) : null}
    </div>
  );
}
