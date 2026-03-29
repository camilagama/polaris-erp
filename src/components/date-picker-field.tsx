"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
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

interface DatePickerFieldProps {
  defaultValue?: string;
  id: string;
  name: string;
  placeholder?: string;
}

const toDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00`);
};

const toInputValue = (value?: Date) =>
  value ? format(value, "yyyy-MM-dd") : "";

export function DatePickerField({
  defaultValue,
  id,
  name,
  placeholder = "Selecionar data",
}: DatePickerFieldProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    toDate(defaultValue)
  );

  return (
    <div className="flex flex-col gap-2">
      <input name={name} type="hidden" value={toInputValue(selectedDate)} />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "w-full justify-start",
              !selectedDate && "text-muted-foreground"
            )}
            id={id}
            type="button"
            variant="outline"
          >
            <HugeiconsIcon data-icon="inline-start" icon={Calendar03Icon} />
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            locale={ptBR}
            mode="single"
            onSelect={setSelectedDate}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
