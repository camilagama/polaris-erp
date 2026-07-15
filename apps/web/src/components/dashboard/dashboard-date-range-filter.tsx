"use client";

import { UrlDateRangeFilter } from "@polaris/ui/components/shared/url-date-range-filter";
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

  const buildQuery = ({
    from: nextFrom,
    preset: nextPreset,
    to: nextTo,
  }: {
    from: string;
    preset: string | null;
    to: string;
  }) =>
    buildDashboardRangeQuery({
      from: nextFrom,
      preset: nextPreset,
      to: nextTo,
    });

  return (
    <UrlDateRangeFilter
      buildQuery={buildQuery}
      from={from}
      preset={preset}
      presets={presets as { label: string; value: string }[]}
      resolvePresetRange={resolvePresetRange}
      to={to}
    />
  );
}
