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
] as const;

export type DashboardDatePreset =
  (typeof dashboardDatePresetOptions)[number]["value"];

export interface DashboardDateRange {
  from: string;
  label: string;
  preset: DashboardDatePreset | null;
  to: string;
}

const dashboardDatePresetValues = new Set<DashboardDatePreset>(
  dashboardDatePresetOptions.map((option) => option.value)
);

const isValidIsoDate = (value: string | undefined) =>
  value ? isoDateSchema.safeParse(value).success : false;

const normalizeDateRange = ({
  from,
  preset,
  to,
}: {
  from: string;
  preset: DashboardDatePreset | null;
  to: string;
}): DashboardDateRange => {
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

export const getDashboardPresetDateRange = (
  preset: DashboardDatePreset,
  referenceDate = new Date()
): DashboardDateRange => {
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

export const resolveDashboardDateRange = (
  searchParams: Record<string, string | string[] | undefined>,
  referenceDate = new Date()
): DashboardDateRange => {
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
    const preset = dashboardDatePresetValues.has(
      presetValue as DashboardDatePreset
    )
      ? (presetValue as DashboardDatePreset)
      : null;

    return normalizeDateRange({
      from: fromValue,
      preset,
      to: toValue,
    });
  }

  if (dashboardDatePresetValues.has(presetValue as DashboardDatePreset)) {
    return getDashboardPresetDateRange(
      presetValue as DashboardDatePreset,
      referenceDate
    );
  }

  return getDashboardPresetDateRange("current-month", referenceDate);
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
    preset: null,
    to: formatDateInputValue(previousTo),
  });
};

export const buildDashboardRangeQuery = ({
  from,
  preset,
  to,
}: {
  from: string;
  preset: DashboardDatePreset | null;
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
