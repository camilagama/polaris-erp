import { BUSINESS_TIME_ZONE, isValidCivilDate } from "@polaris/date";

const ISO_INSTANT_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const compactNumberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
});

const parseIsoInstant = (value: string): Date => {
  const match = ISO_INSTANT_PATTERN.exec(value);
  if (!(match && isValidCivilDate(match[1]))) {
    throw new RangeError(`Invalid ISO instant: ${value}`);
  }

  const [
    ,
    ,
    hour,
    minute,
    second = "00",
    ,
    offset,
    ,
    offsetHour,
    offsetMinute,
  ] = match;
  const invalidTime =
    Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59;
  const invalidOffset =
    offset !== "Z" &&
    (Number(offsetHour) > 23 ||
      Number(offsetMinute) > 59 ||
      offset === "-00:00");
  if (invalidTime || invalidOffset) {
    throw new RangeError(`Invalid ISO instant: ${value}`);
  }

  const instant = new Date(value);
  if (Number.isNaN(instant.valueOf())) {
    throw new RangeError(`Invalid ISO instant: ${value}`);
  }

  return instant;
};

export const formatCurrency = (value: number | string | null | undefined) =>
  currencyFormatter.format(Number(value) || 0);

export const formatCompactCurrency = (
  value: number | string | null | undefined
) => {
  const normalizedValue = Number(value) || 0;
  const prefix = normalizedValue < 0 ? "-R$ " : "R$ ";

  return `${prefix}${compactNumberFormatter.format(Math.abs(normalizedValue))}`;
};

export const formatCivilDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  if (!isValidCivilDate(value)) {
    throw new RangeError(`Invalid ISO civil date: ${value}`);
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export const formatInstantDateTime = (value: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const instant = typeof value === "string" ? parseIsoInstant(value) : value;
  if (Number.isNaN(instant.valueOf())) {
    throw new RangeError("Invalid instant date value.");
  }

  return dateTimeFormatter.format(instant);
};

export const formatPercent = (
  value: number,
  {
    maximumFractionDigits = 2,
    minimumFractionDigits = 0,
  }: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {}
) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value || 0);

export const formatCurrencyInput = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0);

export const parseCurrencyInput = (value: string) => {
  const rawValue = value.replace(/\D/g, "");
  return Number(rawValue) / 100;
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);
