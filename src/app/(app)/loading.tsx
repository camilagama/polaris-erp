import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28 rounded-2xl" />
        <Skeleton className="h-10 w-80 rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-3xl rounded-2xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton
            className="h-32 rounded-2xl border border-border/60"
            key={item}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-80 rounded-2xl border border-border/60" />
        <Skeleton className="h-80 rounded-2xl border border-border/60" />
      </div>
    </div>
  );
}
