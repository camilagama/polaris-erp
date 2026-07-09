import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton className="h-[180px] rounded-xl" key={item} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-10 w-full max-w-72 rounded-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton className="h-[140px] rounded-xl" key={item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  );
}
