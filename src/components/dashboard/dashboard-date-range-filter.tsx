"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
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

      {searchParams.size > 0 ? (
        <p className="text-muted-foreground text-xs">
          O dashboard atualiza todos os cards e graficos com base no intervalo
          selecionado.
        </p>
      ) : null}
    </div>
  );
}
