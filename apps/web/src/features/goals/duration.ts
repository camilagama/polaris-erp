import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Calendar days from the goal period start to the resolution date (inclusive-friendly).
 * Same calendar day → 0.
 */
export const calendarDaysFromPeriodStartToResolution = (
  periodStart: string,
  resolutionDateIso: string
): number => {
  const start = parseISO(`${periodStart}T12:00:00`);
  const endDate = resolutionDateIso.slice(0, 10);
  const end = parseISO(`${endDate}T12:00:00`);

  return differenceInCalendarDays(end, start);
};

export const formatCompletionElapsedLabel = (
  periodStart: string,
  resolutionDateIso: string
): string => {
  const days = calendarDaysFromPeriodStartToResolution(
    periodStart,
    resolutionDateIso
  );

  if (days <= 0) {
    return "No mesmo dia do inicio do periodo";
  }

  return `Em ${days} dia${days === 1 ? "" : "s"} apos o inicio do periodo`;
};
