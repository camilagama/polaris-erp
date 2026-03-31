"use client";

import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toDate = (value: string) => parseISO(`${value}T00:00:00`);

interface ProductDatePickerProps {
  id: string;
  onChange: (value: string) => void;
  value: string;
}

export function ProductDatePicker({
  id,
  onChange,
  value,
}: ProductDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = toDate(value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground"
          )}
          id={id}
          type="button"
          variant="outline"
        >
          <HugeiconsIcon data-icon="inline-start" icon={Calendar01Icon} />
          {format(selectedDate, "dd/MM/yyyy", {
            locale: ptBR,
          })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        <Calendar
          className="rounded-lg bg-muted/5"
          locale={ptBR}
          mode="single"
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}
