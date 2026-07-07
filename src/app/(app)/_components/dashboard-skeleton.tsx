import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-20 w-full rounded-lg" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex h-full flex-col">
          <CardHeader className="gap-1">
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center">
            <Skeleton className="h-40 w-[90%]" />
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="gap-1">
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-[90%]" />
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="gap-1">
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-[90%]" />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card className="flex h-32 flex-col justify-center" key={i}>
            <CardHeader className="py-3">
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
