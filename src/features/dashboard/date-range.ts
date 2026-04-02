import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateInputValue, isoDateSchema } from "@/lib/domain/date";

export interface DateRangePresetOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

export interface ResolvedDateRange<TPreset extends string = string> {
  from: string;
  label: string;
  preset: TPreset | null;
  to: string;
}

export const dashboardDatePresetOptions = [
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

export type DashboardDatePreset =
  (typeof dashboardDatePresetOptions)[number]["value"];

export type DashboardDateRange = ResolvedDateRange<DashboardDatePreset>;

export const createDatePresetValues = <TPreset extends string>(
  presets: readonly DateRangePresetOption<TPreset>[]
) => new Set<TPreset>(presets.map((option) => option.value));

const dashboardDatePresetValues = createDatePresetValues(
  dashboardDatePresetOptions
);

const isValidIsoDate = (value: string | undefined) =>
  value ? isoDateSchema.safeParse(value).success : false;

export const normalizeDateRange = <TPreset extends string>({
  from,
  preset,
  to,
}: {
  from: string;
  preset: TPreset | null;
  to: string;
}): ResolvedDateRange<TPreset> => {
  const normalizedFrom = from <= to ? from : to;
  const normalizedTo = from <= to ? to : from;

  return {
    from: normalizedFrom,
    label: `${format(parseISO(`${normalizedFrom}T00:00:00`), "dd/MM/yyyy", {
      locale: ptBR,
    })} ate ${format(parseISO(`${normalizedTo}T00:00:00`), "dd/MM/yyyy", {
      locale: ptBR,
    })}`,
    preset,
    to: normalizedTo,
  };
};

export const getDashboardPresetDateRange = <
  TPreset extends DashboardDatePreset,
>(
  preset: TPreset,
  referenceDate = new Date()
): ResolvedDateRange<TPreset> => {
  if (preset === "all-time") {
    const today = formatDateInputValue(referenceDate);

    return normalizeDateRange({
      from: today,
      preset,
      to: today,
    });
  }

  if (preset === "current-month") {
    return normalizeDateRange({
      from: formatDateInputValue(startOfMonth(referenceDate)),
      preset,
      to: formatDateInputValue(endOfMonth(referenceDate)),
    });
  }

  if (preset === "previous-month") {
    const previousMonthDate = subMonths(referenceDate, 1);

    return normalizeDateRange({
      from: formatDateInputValue(startOfMonth(previousMonthDate)),
      preset,
      to: formatDateInputValue(endOfMonth(previousMonthDate)),
    });
  }

  if (preset === "last-30-days") {
    return normalizeDateRange({
      from: formatDateInputValue(subDays(referenceDate, 29)),
      preset,
      to: formatDateInputValue(referenceDate),
    });
  }

  return normalizeDateRange({
    from: formatDateInputValue(startOfYear(referenceDate)),
    preset,
    to: formatDateInputValue(endOfYear(referenceDate)),
  });
};

export const getDashboardPresetDateRangeWithBounds = ({
  bounds,
  preset,
  referenceDate = new Date(),
}: {
  bounds: {
    from: string;
    to: string;
  };
  preset: DashboardDatePreset;
  referenceDate?: Date;
}): DashboardDateRange => {
  if (preset === "all-time") {
    return normalizeDateRange({
      from: bounds.from,
      preset,
      to: formatDateInputValue(referenceDate),
    });
  }

  return getDashboardPresetDateRange(preset, referenceDate);
};

export const resolveDateRangeFromSearchParams = <TPreset extends string>({
  defaultPreset,
  getPresetDateRange,
  presetValues,
  referenceDate = new Date(),
  searchParams,
}: {
  defaultPreset: TPreset;
  getPresetDateRange: (
    preset: TPreset,
    referenceDate?: Date
  ) => ResolvedDateRange<TPreset>;
  presetValues: Set<TPreset>;
  referenceDate?: Date;
  searchParams: Record<string, string | string[] | undefined>;
}): ResolvedDateRange<TPreset> => {
  const fromValue = Array.isArray(searchParams.from)
    ? searchParams.from[0]
    : searchParams.from;
  const toValue = Array.isArray(searchParams.to)
    ? searchParams.to[0]
    : searchParams.to;
  const presetValue = Array.isArray(searchParams.preset)
    ? searchParams.preset[0]
    : searchParams.preset;

  if (
    fromValue &&
    toValue &&
    isValidIsoDate(fromValue) &&
    isValidIsoDate(toValue)
  ) {
    const preset = presetValues.has(presetValue as TPreset)
      ? (presetValue as TPreset)
      : null;

    return normalizeDateRange({
      from: fromValue,
      preset,
      to: toValue,
    });
  }

  if (presetValues.has(presetValue as TPreset)) {
    return getPresetDateRange(presetValue as TPreset, referenceDate);
  }

  return getPresetDateRange(defaultPreset, referenceDate);
};

export const resolveDashboardDateRange = ({
  bounds,
  referenceDate = new Date(),
  searchParams,
}: {
  bounds?: {
    from: string;
    to: string;
  };
  referenceDate?: Date;
  searchParams: Record<string, string | string[] | undefined>;
}): DashboardDateRange => {
  return resolveDateRangeFromSearchParams({
    defaultPreset: "current-month",
    getPresetDateRange: (preset, currentReferenceDate) =>
      bounds
        ? getDashboardPresetDateRangeWithBounds({
            bounds,
            preset,
            referenceDate: currentReferenceDate,
          })
        : getDashboardPresetDateRange(preset, currentReferenceDate),
    presetValues: dashboardDatePresetValues,
    referenceDate,
    searchParams,
  });
};

export const getDashboardPreviousDateRange = ({
  from,
  to,
}: Pick<DashboardDateRange, "from" | "to">): DashboardDateRange => {
  const fromDate = parseISO(`${from}T00:00:00`);
  const toDate = parseISO(`${to}T00:00:00`);
  const rangeLength =
    Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
    ) - 1;
  const previousTo = subDays(fromDate, 1);
  const previousFrom = subDays(previousTo, rangeLength);

  return normalizeDateRange({
    from: formatDateInputValue(previousFrom),
    preset: null as DashboardDatePreset | null,
    to: formatDateInputValue(previousTo),
  });
};

export const buildDashboardRangeQuery = ({
  from,
  preset,
  to,
}: {
  from: string;
  preset: string | null;
  to: string;
}) => {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);

  if (preset) {
    params.set("preset", preset);
  }

  return params.toString();
};
