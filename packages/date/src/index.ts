export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
});

interface CivilDateParts {
  day: number;
  month: number;
  year: number;
}

const formatCivilDate = ({ day, month, year }: CivilDateParts): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseCivilDate = (value: string): CivilDateParts => {
  const match = CIVIL_DATE_PATTERN.exec(value);

  if (!match) {
    throw new RangeError(`Invalid ISO civil date: ${value}`);
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const parsed = {
    day,
    month,
    year,
  };

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid ISO civil date: ${value}`);
  }

  return parsed;
};

export const isValidCivilDate = (value: string): boolean => {
  try {
    parseCivilDate(value);
    return true;
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }

    throw error;
  }
};

export const formatBusinessDate = (value = new Date()): string => {
  const parts = businessDateFormatter.formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

export const formatBusinessDateLabel = (
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = "pt-BR"
): string => {
  const { day, month, year } = parseCivilDate(value);
  // UTC is only a stable carrier for these civil fields; it is not a business-time conversion.
  const labelDate = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(labelDate);
};

export const shiftBusinessDate = (value: string, days: number): string => {
  if (!Number.isInteger(days)) {
    throw new RangeError("Business-date shifts must be whole days.");
  }

  const { day, month, year } = parseCivilDate(value);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return formatCivilDate({
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
  });
};

export const getBusinessMonthBounds = (
  value: string
): { from: string; to: string } => {
  const { month, year } = parseCivilDate(value);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: formatCivilDate({ day: 1, month, year }),
    to: formatCivilDate({ day: lastDay, month, year }),
  };
};
