"use client";

import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateInputValue } from "@/lib/domain/date";
import { cn } from "@/lib/utils";

interface DateRangePickerPreset {
  label: string;
  value: string;
}

interface DateRangePickerProps {
  disabled?: boolean;
  onChange: (value: {
    from: string;
    preset: string | null;
    to: string;
  }) => void;
  popoverAlign?: "center" | "end" | "start";
  popoverContentClassName?: string;
  presets?: readonly DateRangePickerPreset[];
  resolvePresetRange?: (preset: string) => { from: string; to: string };
  triggerClassName?: string;
  value: {
    from: string;
    preset: string | null;
    to: string;
  };
}

const toDate = (value: string) => parseISO(`${value}T00:00:00`);

const toDraftRange = ({
  from,
  to,
}: {
  from: string;
  to: string;
}): DateRange => ({
  from: toDate(from),
  to: toDate(to),
});

export function DateRangePicker({
  disabled = false,
  onChange,
  popoverAlign = "end",
  popoverContentClassName,
  presets = [],
  resolvePresetRange,
  triggerClassName,
  value,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const appliedRange = useMemo(
    () =>
      toDraftRange({
        from: value.from,
        to: value.to,
      }),
    [value.from, value.to]
  );
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    appliedRange
  );
  const [draftPreset, setDraftPreset] = useState<string | null>(value.preset);

  useEffect(() => {
    setDraftRange(appliedRange);
    setDraftPreset(value.preset);
  }, [appliedRange, value.preset]);

  const draftRangeIsComplete = Boolean(draftRange?.from && draftRange.to);

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setDraftRange(appliedRange);
          setDraftPreset(value.preset);
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "min-w-56 justify-start text-left font-normal sm:min-w-72",
            triggerClassName,
            disabled && "opacity-70"
          )}
          disabled={disabled}
          size="default"
          type="button"
          variant="outline"
        >
          <HugeiconsIcon data-icon="inline-start" icon={Calendar01Icon} />
          {format(toDate(value.from), "dd/MM/yyyy", {
            locale: ptBR,
          })}{" "}
          ate{" "}
          {format(toDate(value.to), "dd/MM/yyyy", {
            locale: ptBR,
          })}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={popoverAlign}
        className={cn("w-auto p-0", popoverContentClassName)}
      >
        <div
          className={cn(
            "grid gap-0",
            presets?.length > 0 && "sm:grid-cols-[130px_1fr]"
          )}
        >
          {presets.length > 0 ? (
            <div className="flex flex-col gap-2 border-border/60 border-b bg-muted/10 p-3 sm:border-r sm:border-b-0">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Presets
              </p>
              {presets.map((option) => (
                <Button
                  className="justify-start"
                  disabled={disabled}
                  key={option.value}
                  onClick={() => {
                    if (!resolvePresetRange) {
                      return;
                    }

                    const presetRange = resolvePresetRange(option.value);

                    setDraftRange(
                      toDraftRange({
                        from: presetRange.from,
                        to: presetRange.to,
                      })
                    );
                    setDraftPreset(option.value);
                  }}
                  size="sm"
                  type="button"
                  variant={draftPreset === option.value ? "default" : "ghost"}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col">
            <Calendar
              className="rounded-none bg-background p-3"
              locale={ptBR}
              mode="range"
              onSelect={(rangeValue) => {
                setDraftRange(rangeValue);
                setDraftPreset(null);
              }}
              selected={draftRange}
            />

            <div className="flex flex-col gap-3 border-border/60 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setDraftRange(appliedRange);
                    setDraftPreset(value.preset);
                    setOpen(false);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={!draftRangeIsComplete || disabled}
                  onClick={() => {
                    if (!(draftRange?.from && draftRange.to)) {
                      return;
                    }

                    onChange({
                      from: formatDateInputValue(draftRange.from),
                      preset: draftPreset,
                      to: formatDateInputValue(draftRange.to),
                    });
                    setOpen(false);
                  }}
                  size="sm"
                  type="button"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
