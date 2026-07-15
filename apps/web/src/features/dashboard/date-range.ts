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

type DashboardDatePreset = (typeof dashboardDatePresetOptions)[number]["value"];

type DashboardDateRange = ResolvedDateRange<DashboardDatePreset>;

export const createDatePresetValues = <TPreset extends string>(
  presets: readonly DateRangePresetOption<TPreset>[]
) => new Set<TPreset>(presets.map((option) => option.value));

const dashboardDatePresetValues = createDatePresetValues(
  dashboardDatePresetOptions
);

const isValidIsoDate = (value: string | undefined) =>
  value ? isoDateSchema.safeParse(value).success : false;

const formatDateRangeLabel = (value: string): string => {
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
};

const shiftBusinessDate = (value: string, days: number): string => {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
};

const getMonthBounds = (value: string): { from: string; to: string } => {
  const [year, month] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthString = String(month).padStart(2, "0");

  return {
    from: `${year}-${monthString}-01`,
    to: `${year}-${monthString}-${String(lastDay).padStart(2, "0")}`,
  };
};

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
    label: `${formatDateRangeLabel(normalizedFrom)} ate ${formatDateRangeLabel(normalizedTo)}`,
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
  const today = formatDateInputValue(referenceDate);

  if (preset === "all-time") {
    return normalizeDateRange({
      from: today,
      preset,
      to: today,
    });
  }

  if (preset === "current-month") {
    const bounds = getMonthBounds(today);

    return normalizeDateRange({
      from: bounds.from,
      preset,
      to: bounds.to,
    });
  }

  if (preset === "previous-month") {
    const [year, month] = today.split("-").map(Number);
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const bounds = getMonthBounds(
      `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`
    );

    return normalizeDateRange({
      from: bounds.from,
      preset,
      to: bounds.to,
    });
  }

  if (preset === "last-30-days") {
    return normalizeDateRange({
      from: shiftBusinessDate(today, -29),
      preset,
      to: today,
    });
  }

  return normalizeDateRange({
    from: `${today.slice(0, 4)}-01-01`,
    preset,
    to: `${today.slice(0, 4)}-12-31`,
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
}): DashboardDateRange =>
  resolveDateRangeFromSearchParams({
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
