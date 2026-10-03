import {
  formatBusinessDate,
  isValidCivilDate,
  shiftBusinessDate,
} from "@polaris/date";

const DEFAULT_EVENTS_PRESET = "last-7-days";

export type EventsDatePreset = "last-7-days" | "last-30-days";

export interface EventsDateRange {
  from: string;
  invalidInput: boolean;
  preset: EventsDatePreset | null;
  to: string;
}

export type EventsSearchParams = Record<string, string | string[] | undefined>;

const isEventsDatePreset = (value: string | null): value is EventsDatePreset =>
  value === "last-7-days" || value === "last-30-days";

export const resolveEventsPresetRange = (
  preset: string,
  now = new Date()
): { from: string; to: string } => {
  const today = formatBusinessDate(now);
  const daysToShift = preset === "last-30-days" ? -29 : -6;

  return {
    from: shiftBusinessDate(today, daysToShift),
    to: today,
  };
};

export const resolveEventsDateRange = (
  searchParams: EventsSearchParams,
  now = new Date()
): EventsDateRange => {
  const from = searchParams.from;
  const to = searchParams.to;
  const presetValue = searchParams.preset;
  const preset = typeof presetValue === "string" ? presetValue : null;
  const hasDateParameters = from !== undefined || to !== undefined;
  const hasSupportedPreset = isEventsDatePreset(preset);

  if (!hasDateParameters) {
    const defaultPreset = hasSupportedPreset ? preset : DEFAULT_EVENTS_PRESET;
    const presetRange = resolveEventsPresetRange(defaultPreset, now);

    return {
      ...presetRange,
      invalidInput: presetValue !== undefined && !hasSupportedPreset,
      preset: defaultPreset,
    };
  }

  if (
    typeof from === "string" &&
    typeof to === "string" &&
    isValidCivilDate(from) &&
    isValidCivilDate(to) &&
    from <= to
  ) {
    return {
      from,
      invalidInput: false,
      preset: hasSupportedPreset ? preset : null,
      to,
    };
  }

  return {
    ...resolveEventsPresetRange(DEFAULT_EVENTS_PRESET, now),
    invalidInput: true,
    preset: DEFAULT_EVENTS_PRESET,
  };
};
