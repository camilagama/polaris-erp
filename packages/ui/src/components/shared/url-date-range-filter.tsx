"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { DateRangePicker } from "../ui/date-range-picker";

export interface UrlDateRangeFilterProps {
  buildQuery: (params: {
    from: string;
    preset: string | null;
    to: string;
  }) => string;
  from: string;
  preset: string | null;
  presets?: { label: string; value: string }[];
  resolvePresetRange: (preset: string) => { from: string; to: string };
  to: string;
}

export function UrlDateRangeFilter({
  buildQuery,
  from,
  preset,
  presets,
  resolvePresetRange,
  to,
}: UrlDateRangeFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-full sm:justify-end">
      <DateRangePicker
        disabled={pending}
        onChange={({ from: nextFrom, preset: nextPreset, to: nextTo }) => {
          const query = buildQuery({
            from: nextFrom,
            preset: nextPreset,
            to: nextTo,
          });

          startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname);
          });
        }}
        presets={presets}
        resolvePresetRange={resolvePresetRange}
        value={{
          from,
          preset,
          to,
        }}
      />
    </div>
  );
}
