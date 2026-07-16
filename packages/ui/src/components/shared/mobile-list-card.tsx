import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

function MobileListCard({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4",
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

function MobileListCardHeader({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3", className)}
      ref={ref}
      {...props}
    />
  );
}

function MobileListCardTitle({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      className={cn("min-w-0 font-medium", className)}
      ref={ref}
      {...props}
    />
  );
}

function MobileListCardBadge({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return <div className={cn("shrink-0", className)} ref={ref} {...props} />;
}

function MobileListCardGrid({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      className={cn("mt-4 grid grid-cols-2 gap-3", className)}
      ref={ref}
      {...props}
    />
  );
}

function MobileListCardGridItem({
  className,
  label,
  value,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border/50 px-3 py-2",
        className
      )}
      ref={ref}
      {...props}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
        {label}
      </p>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function MobileListCardFooter({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center justify-between text-xs",
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

function MobileListCardAction({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
  return <div className={cn("mt-4", className)} ref={ref} {...props} />;
}

export {
  MobileListCard,
  MobileListCardAction,
  MobileListCardBadge,
  MobileListCardFooter,
  MobileListCardGrid,
  MobileListCardGridItem,
  MobileListCardHeader,
  MobileListCardTitle,
};
