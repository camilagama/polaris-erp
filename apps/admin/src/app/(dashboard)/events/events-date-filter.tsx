"use client";

import { UrlDateRangeFilter } from "@polaris/ui/components/shared/url-date-range-filter";
import { resolveEventsPresetRange } from "./events-date-range";

interface EventsDateFilterProps {
  from: string;
  preset: string | null;
  to: string;
}

const eventsDatePresetOptions = [
  { label: "Últimos 7 dias", value: "last-7-days" },
  { label: "Últimos 30 dias", value: "last-30-days" },
];

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
