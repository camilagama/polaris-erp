"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      captionLayout="label"
      className={cn("bg-background p-3", className)}
      classNames={{
        button_next: cn(
          buttonVariants({ size: "icon-xs", variant: "ghost" }),
          "size-6",
          defaultClassNames.button_next
        ),
        button_previous: cn(
          buttonVariants({ size: "icon-xs", variant: "ghost" }),
          "size-6",
          defaultClassNames.button_previous
        ),
        caption_label: cn(
          "font-medium text-xs capitalize",
          defaultClassNames.caption_label
        ),
        day: cn("text-xs", defaultClassNames.day),
        day_button: cn(
          buttonVariants({ size: "icon-xs", variant: "ghost" }),
          "size-7 font-normal aria-selected:bg-primary aria-selected:text-primary-foreground",
          defaultClassNames.day_button
        ),
        month: cn("space-y-4", defaultClassNames.month),
        month_caption: cn(
          "flex items-center justify-center pt-1",
          defaultClassNames.month_caption
        ),
        months: cn("flex flex-col", defaultClassNames.months),
        nav: cn("flex items-center gap-1", defaultClassNames.nav),
        weekday: cn(
          "font-normal text-[11px] text-muted-foreground",
          defaultClassNames.weekday
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          ) : (
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          ),
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

export { Calendar };
