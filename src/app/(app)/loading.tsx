const skeletonClassName = "animate-pulse rounded-2xl bg-muted/60";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className={`${skeletonClassName} h-4 w-28`} />
        <div className={`${skeletonClassName} h-10 w-80`} />
        <div className={`${skeletonClassName} h-4 w-full max-w-3xl`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            className={`${skeletonClassName} h-32 border border-border/60`}
            key={item}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={`${skeletonClassName} h-80 border border-border/60`} />
        <div className={`${skeletonClassName} h-80 border border-border/60`} />
      </div>
    </div>
  );
}
