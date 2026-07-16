import { formatBusinessDate, getBusinessMonthBounds } from "@polaris/date";

export const defaultMonthRange = (now = new Date()) => {
  const bounds = getBusinessMonthBounds(formatBusinessDate(now));

  return {
    periodEnd: bounds.to,
    periodStart: bounds.from,
    rangePreset: null as string | null,
  };
};
