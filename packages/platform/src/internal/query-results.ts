import { isValidCivilDate } from "@polaris/date";

const POSTGRES_TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?([+-])(\d{2})(?::?(\d{2}))?$/;

export const toRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return result.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null
    );
  }

  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    if (Array.isArray(rows)) {
      return rows.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null
      );
    }
  }

  return [];
};

export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizePostgresTimestamp = (value: string): string => {
  const match = POSTGRES_TIMESTAMP_PATTERN.exec(value);

  if (!match) {
    return value;
  }

  const [
    ,
    civilDate,
    hourText,
    minuteText,
    secondText,
    fraction,
    offsetSign,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText);
  const offsetMinute = Number(offsetMinuteText ?? "0");

  if (
    !isValidCivilDate(civilDate) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return value;
  }

  const milliseconds = (fraction ?? "").slice(0, 3).padEnd(3, "0");
  const normalizedOffset = `${offsetSign}${offsetHourText}:${offsetMinuteText ?? "00"}`;
  const instant = new Date(
    `${civilDate}T${hourText}:${minuteText}:${secondText}.${milliseconds}${normalizedOffset}`
  );

  return Number.isFinite(instant.getTime()) ? instant.toISOString() : value;
};

export const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.length > 0) {
    return normalizePostgresTimestamp(value);
  }

  return null;
};

export const toStringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
