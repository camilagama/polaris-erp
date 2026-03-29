"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";
import { useEffect, useRef } from "react";
import {
  type DayButton,
  DayPicker,
  getDefaultClassNames,
  type Locale,
} from "react-day-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Calendar({
  buttonVariant = "ghost",
  captionLayout = "label",
  className,
  classNames,
  components,
  formatters,
  locale,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn("group/calendar w-fit bg-background p-3", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ size: "icon", variant: buttonVariant }),
          "size-7",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ size: "icon", variant: buttonVariant }),
          "size-7",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-7 items-center justify-center px-8",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "font-medium text-sm",
          defaultClassNames.caption_label
        ),
        dropdowns: cn("flex items-center gap-1.5", defaultClassNames.dropdowns),
        dropdown_root: cn(
          "relative rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 text-center text-[0.8rem] text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "relative aspect-square h-9 w-9 p-0 text-center",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-muted", defaultClassNames.range_start),
        range_middle: cn(
          "rounded-none bg-muted",
          defaultClassNames.range_middle
        ),
        range_end: cn("rounded-r-md bg-muted", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-muted text-foreground",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground opacity-60",
          defaultClassNames.outside
        ),
        disabled: cn("opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClassName, orientation, ...iconProps }) => {
          let icon = ArrowDown01Icon;

          if (orientation === "left") {
            icon = ArrowLeft01Icon;
          } else if (orientation === "right") {
            icon = ArrowRight01Icon;
          }

          return (
            <HugeiconsIcon
              className={cn("size-4", iconClassName)}
              icon={icon}
              strokeWidth={2}
              {...iconProps}
            />
          );
        },
        DayButton: (dayButtonProps) => (
          <CalendarDayButton locale={locale} {...dayButtonProps} />
        ),
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      locale={locale}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  locale,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <Button
      className={cn(
        "size-9 rounded-md font-normal data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        className
      )}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      ref={ref}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
