import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

const MobileListCard = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <article
    className={cn(
      "rounded-xl border border-border/60 bg-card p-4 shadow-sm",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileListCard.displayName = "MobileListCard";

const MobileListCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("flex items-start justify-between gap-3", className)}
    ref={ref}
    {...props}
  />
));
MobileListCardHeader.displayName = "MobileListCardHeader";

const MobileListCardTitle = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("min-w-0 font-medium", className)} ref={ref} {...props} />
));
MobileListCardTitle.displayName = "MobileListCardTitle";

const MobileListCardBadge = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("shrink-0", className)} ref={ref} {...props} />
));
MobileListCardBadge.displayName = "MobileListCardBadge";

const MobileListCardGrid = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("mt-4 grid grid-cols-2 gap-3", className)}
    ref={ref}
    {...props}
  />
));
MobileListCardGrid.displayName = "MobileListCardGrid";

const MobileListCardGridItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    label: string;
    value: ReactNode;
  }
>(({ className, label, value, ...props }, ref) => (
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
));
MobileListCardGridItem.displayName = "MobileListCardGridItem";

const MobileListCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("mt-3 flex items-center justify-between text-xs", className)}
    ref={ref}
    {...props}
  />
));
MobileListCardFooter.displayName = "MobileListCardFooter";

const MobileListCardAction = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("mt-4", className)} ref={ref} {...props} />
));
MobileListCardAction.displayName = "MobileListCardAction";

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
