import {
  createDatePresetValues,
  type DateRangePresetOption,
  getDashboardPresetDateRange,
  normalizeDateRange,
  type ResolvedDateRange,
  resolveDateRangeFromSearchParams,
} from "@/features/dashboard/date-range";
import { formatDateInputValue } from "@/lib/domain/date";

export const salesDatePresetOptions = [
  {
    label: "Mes atual",
    value: "current-month",
  },
  {
    label: "Mes anterior",
    value: "previous-month",
  },
  {
    label: "Ultimos 30 dias",
    value: "last-30-days",
  },
  {
    label: "Este ano",
    value: "current-year",
  },
  {
    label: "Todo periodo",
    value: "all-time",
  },
] as const satisfies readonly DateRangePresetOption[];

export type SalesDatePreset = (typeof salesDatePresetOptions)[number]["value"];

export type SalesDateRange = ResolvedDateRange<SalesDatePreset>;

const salesDatePresetValues = createDatePresetValues(salesDatePresetOptions);

export const getSalesPresetDateRange = ({
  bounds,
  preset,
  referenceDate = new Date(),
}: {
  bounds: {
    from: string;
    to: string;
  };
  preset: SalesDatePreset;
  referenceDate?: Date;
}): SalesDateRange => {
  if (preset === "all-time") {
    return normalizeDateRange({
      from: bounds.from,
      preset,
      to: formatDateInputValue(referenceDate),
    });
  }

  const dashboardRange = getDashboardPresetDateRange(preset, referenceDate);

  return normalizeDateRange({
    from: dashboardRange.from,
    preset,
    to: dashboardRange.to,
  });
};

export const resolveSalesDateRange = ({
  bounds,
  referenceDate = new Date(),
  searchParams,
}: {
  bounds: {
    from: string;
    to: string;
  };
  referenceDate?: Date;
  searchParams: Record<string, string | string[] | undefined>;
}): SalesDateRange =>
  resolveDateRangeFromSearchParams({
    defaultPreset: "all-time",
    getPresetDateRange: (preset, currentReferenceDate) =>
      getSalesPresetDateRange({
        bounds,
        preset,
        referenceDate: currentReferenceDate,
      }),
    presetValues: salesDatePresetValues,
    referenceDate,
    searchParams,
  });
