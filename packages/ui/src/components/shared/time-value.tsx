import { formatCivilDate, formatInstantDateTime } from "../../lib/formatters";

interface CivilDateValueProps {
  kind: "civil-date";
  value: string | null;
}

interface InstantValueProps {
  kind: "instant";
  value: Date | string | null;
}

type TimeValueProps = CivilDateValueProps | InstantValueProps;

export function TimeValue({ kind, value }: TimeValueProps) {
  if (!value) {
    return "-";
  }

  if (kind === "civil-date") {
    if (typeof value !== "string") {
      throw new RangeError("Civil dates must be ISO calendar-date strings.");
    }

    return <time dateTime={value}>{formatCivilDate(value)}</time>;
  }

  const label = formatInstantDateTime(value);
  const dateTime = value instanceof Date ? value.toISOString() : value;

  return <time dateTime={dateTime}>{label}</time>;
}

export function BusinessTimeZoneNotice() {
  return (
    <p className="text-muted-foreground text-xs">
      Horários no fuso de São Paulo
    </p>
  );
}
