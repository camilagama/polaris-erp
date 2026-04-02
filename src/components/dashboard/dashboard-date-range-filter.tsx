"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  buildDashboardRangeQuery,
  type DateRangePresetOption,
  dashboardDatePresetOptions,
  getDashboardPresetDateRange,
} from "@/features/dashboard/date-range";

interface DashboardDateRangeFilterProps {
  from: string;
  preset: string | null;
  presets?: readonly DateRangePresetOption<string>[];
  resolvePresetRange?: (presetValue: string) => { from: string; to: string };
  to: string;
}

export function DashboardDateRangeFilter({
  from,
  preset,
  presets = dashboardDatePresetOptions,
  resolvePresetRange = (presetValue) =>
    getDashboardPresetDateRange(
      presetValue as Parameters<typeof getDashboardPresetDateRange>[0]
    ),
  to,
}: DashboardDateRangeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
