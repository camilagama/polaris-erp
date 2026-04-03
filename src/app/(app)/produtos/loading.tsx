import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="flex flex-col gap-6 px-6 pt-2 pb-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        <div className="flex flex-col gap-4 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-2">
            <Skeleton className="h-10 w-full rounded-lg sm:w-80" />
            <Skeleton className="hidden h-10 w-28 rounded-lg sm:block" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden flex-col gap-0 overflow-hidden rounded-lg border border-border/50 lg:flex">
        <div className="h-11 border-border/40 border-b bg-muted/30" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            className="flex h-[72px] items-center gap-4 border-border/40 border-b px-4 last:border-0"
            key={i}
          >
            <Skeleton className="size-11 shrink-0 rounded-md" />
            <Skeleton className="h-5 w-48 rounded-md" />
            <div className="mx-auto flex gap-4">
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="ml-auto h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="grid gap-3 lg:hidden">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton className="h-36 rounded-xl" key={i} />
        ))}
      </div>
    </div>
  );
}
