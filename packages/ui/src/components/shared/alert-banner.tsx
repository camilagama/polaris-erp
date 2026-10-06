import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { cn } from "../../lib/utils";

export type AlertSeverity = "negative" | "neutral" | "positive";

export interface AlertBannerMessage {
  action?: {
    label: string;
    href: string;
  };
  id: string;
  message: string;
  severity: AlertSeverity;
}

interface AlertBannerProps {
  alerts: AlertBannerMessage[];
  className?: string;
}

const containerClassBySeverity: Record<AlertSeverity, string> = {
  negative: "bg-destructive/8 text-foreground border border-destructive/20",
  neutral: "bg-muted/50 text-foreground border border-border/50",
  positive: "bg-emerald-500/8 text-foreground border border-emerald-500/20",
};

const dotClassBySeverity: Record<AlertSeverity, string> = {
  negative: "bg-destructive",
  neutral: "bg-muted-foreground/50",
  positive: "bg-emerald-500",
};

export function AlertBanner({ alerts, className }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {alerts.map((alert) => (
        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-lg px-4 py-3 text-sm leading-relaxed",
            containerClassBySeverity[alert.severity]
          )}
          key={alert.id}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 block size-1.5 shrink-0 rounded-full",
                dotClassBySeverity[alert.severity]
              )}
            />
            <span>{alert.message}</span>
          </div>
          {alert.action && (
            <Link
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-background/50 px-2.5 py-1 font-medium text-xs transition-colors hover:bg-background"
              href={alert.action.href}
            >
              {alert.action.label}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={12}
                strokeWidth={2}
              />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
