import { Card, CardContent, CardHeader } from "@polaris/ui/components/ui/card";
import { Skeleton } from "@polaris/ui/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Insight Banner (Fino como o real) */}
      <Skeleton className="h-14 w-full rounded-xl" />

      {/* Top Grid: Sales Contribution & Profit Margin (Sem goals, 2 colunas proporcionais) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex h-full flex-col">
          <Card className="flex h-full flex-col">
            <CardHeader className="gap-1 pb-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </CardHeader>
            <CardContent className="flex flex-1 items-center justify-center pt-0">
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="flex h-full flex-col">
          <Card className="flex h-full flex-col justify-center">
            <CardHeader className="gap-1 pb-4">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-0">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-[160px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card className="flex h-[130px] flex-col justify-center" key={i}>
            <CardHeader className="gap-1 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Section: Revenue vs Costs & Top Products */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="flex h-[360px] flex-col justify-center">
          <CardHeader className="gap-1 pb-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="flex h-full flex-col pt-0">
            <Skeleton className="w-full flex-1" />
          </CardContent>
        </Card>

        <Card className="flex h-[360px] flex-col">
          <CardHeader className="pb-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
            <Skeleton className="h-[42px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
