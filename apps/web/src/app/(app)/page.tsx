import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardDateRangeFilter } from "@/components/dashboard/dashboard-date-range-filter";
import {
  dashboardDatePresetOptions,
  resolveDashboardDateRange,
} from "@/features/dashboard/date-range";
import { getDashboardDateBounds } from "@/features/dashboard/server";
import { requirePageAppContext } from "@/lib/app-session";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Dashboard | Polaris",
  description: "Painel inicial da operacao protegida do Polaris.",
};

export default async function DashboardPage(props: PageProps<"/">) {
  const context = await requirePageAppContext();
  const searchParams = await props.searchParams;

  // Date bounds fetcher continues at the top so the filter component renders quickly
  const bounds = await getDashboardDateBounds(context.organizationId);
  const selectedRange = resolveDashboardDateRange({
    bounds,
    searchParams,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:min-w-72 sm:justify-end">
          <DashboardDateRangeFilter
            bounds={bounds}
            from={selectedRange.from}
            preset={selectedRange.preset}
            presets={dashboardDatePresetOptions}
            to={selectedRange.to}
            variant="dashboard"
          />
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          organizationId={context.organizationId}
          selectedRange={selectedRange}
        />
      </Suspense>
    </div>
  );
}
