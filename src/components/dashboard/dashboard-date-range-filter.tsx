"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  buildDashboardRangeQuery,
  type DashboardDatePreset,
  dashboardDatePresetOptions,
  getDashboardPresetDateRange,
} from "@/features/dashboard/date-range";

interface DashboardDateRangeFilterProps {
  from: string;
  preset: DashboardDatePreset | null;
  to: string;
}

export function DashboardDateRangeFilter({
  from,
  preset,
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
            preset: nextPreset as DashboardDatePreset | null,
            to: nextTo,
          });

          startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname);
          });
        }}
        presets={dashboardDatePresetOptions}
        resolvePresetRange={(presetValue) =>
          getDashboardPresetDateRange(presetValue as DashboardDatePreset)
        }
        value={{
          from,
          preset,
          to,
        }}
      />
    </div>
  );
}
