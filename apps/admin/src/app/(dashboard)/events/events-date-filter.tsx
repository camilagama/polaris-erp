"use client";

import { formatBusinessDate, shiftBusinessDate } from "@polaris/date";
import { UrlDateRangeFilter } from "@polaris/ui/components/shared/url-date-range-filter";

interface EventsDateFilterProps {
  from: string;
  preset: string | null;
  to: string;
}

export const eventsDatePresetOptions = [
  { label: "Últimos 7 dias", value: "last-7-days" },
  { label: "Últimos 30 dias", value: "last-30-days" },
];

export const resolveEventsPresetRange = (
  preset: string,
  now = new Date()
): { from: string; to: string } => {
  const today = formatBusinessDate(now);

  if (preset === "last-7-days") {
    return { from: shiftBusinessDate(today, -6), to: today };
  }
  if (preset === "last-30-days") {
    return { from: shiftBusinessDate(today, -29), to: today };
  }

  return { from: today, to: today };
};

export function EventsDateFilter({ from, preset, to }: EventsDateFilterProps) {
  const buildQuery = ({
    from: nextFrom,
    preset: nextPreset,
    to: nextTo,
  }: {
    from: string;
    preset: string | null;
    to: string;
  }) => {
    const params = new URLSearchParams();
    if (nextFrom) {
      params.set("from", nextFrom);
    }
    if (nextTo) {
      params.set("to", nextTo);
    }
    if (nextPreset) {
      params.set("preset", nextPreset);
    }
    return params.toString();
  };

  return (
    <UrlDateRangeFilter
      buildQuery={buildQuery}
      from={from}
      preset={preset}
      presets={eventsDatePresetOptions}
      resolvePresetRange={resolveEventsPresetRange}
      to={to}
    />
  );
}
