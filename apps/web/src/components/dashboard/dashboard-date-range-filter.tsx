"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  buildDashboardRangeQuery,
  type DateRangePresetOption,
  dashboardDatePresetOptions,
  getDashboardPresetDateRange,
  getDashboardPresetDateRangeWithBounds,
} from "@/features/dashboard/date-range";
import { getSalesPresetDateRange } from "@/features/sales/date-range";

interface DashboardDateRangeFilterProps {
  bounds?: {
    from: string;
    to: string;
  };
  from: string;
  preset: string | null;
  presets?: readonly DateRangePresetOption<string>[];
  to: string;
  variant?: "dashboard" | "sales";
}

export function DashboardDateRangeFilter({
  bounds,
  from,
  preset,
  presets = dashboardDatePresetOptions,
  to,
  variant = "dashboard",
}: DashboardDateRangeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const resolvePresetRange = (presetValue: string) => {
    if (variant === "sales" && bounds) {
      return getSalesPresetDateRange({
        bounds,
        preset: presetValue as Parameters<
          typeof getSalesPresetDateRange
        >[0]["preset"],
      });
    }

    if (bounds) {
      return getDashboardPresetDateRangeWithBounds({
        bounds,
        preset: presetValue as Parameters<
          typeof getDashboardPresetDateRangeWithBounds
        >[0]["preset"],
      });
    }

    return getDashboardPresetDateRange(
      presetValue as Parameters<typeof getDashboardPresetDateRange>[0]
    );
  };

  return (
    <div className="flex w-full sm:justify-end">
      <DateRangePicker
        disabled={pending}
        onChange={({ from: nextFrom, preset: nextPreset, to: nextTo }) => {
          const query = buildDashboardRangeQuery({
            from: nextFrom,
            preset: nextPreset,
            to: nextTo,
          });

          startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname);
          });
        }}
        presets={presets}
        resolvePresetRange={resolvePresetRange}
        value={{
          from,
          preset,
          to,
        }}
      />
    </div>
  );
}
