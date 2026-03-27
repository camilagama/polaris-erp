import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}

export function PageLayout({
  actions,
  children,
  description,
  eyebrow = "Operacao",
  title,
}: PageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
            {eyebrow}
          </p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight">
            {title}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{description}</p>
        </div>
        {actions ? (
          <div className="flex items-center gap-3">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        className
      )}
    >
      {children}
    </section>
  );
}

export function FeedbackBanner({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (!(error || message)) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        error
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      )}
    >
      {error ?? message}
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-border border-dashed bg-muted/20 px-5 py-10 text-center">
      <div className="mx-auto max-w-md space-y-2">
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
