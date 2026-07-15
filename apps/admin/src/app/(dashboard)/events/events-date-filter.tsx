"use client";

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

const shiftBusinessDate = (value: string, days: number): string => {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

export function EventsDateFilter({ from, preset, to }: EventsDateFilterProps) {
  const resolvePresetRange = (presetValue: string) => {
    const today = new Date().toISOString().slice(0, 10);
    if (presetValue === "last-7-days") {
      return { from: shiftBusinessDate(today, -6), to: today };
    }
    if (presetValue === "last-30-days") {
      return { from: shiftBusinessDate(today, -29), to: today };
    }
    return { from: today, to: today };
  };

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
      resolvePresetRange={resolvePresetRange}
      to={to}
    />
  );
}
