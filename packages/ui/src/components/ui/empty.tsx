"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";

import { cn } from "../../lib/utils";

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  description?: string;
  // biome-ignore lint/suspicious/noExplicitAny: aceita o tipo base de icone do hugeicons
  icon?: any;
  title: string;
}

export function Empty({
  className,
  icon,
  title,
  description,
  children,
  ...props
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card px-4 py-14 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-5 flex shrink-0 items-center justify-center">
          <HugeiconsIcon
            className="text-muted-foreground/40"
            icon={icon}
            size={44}
            strokeWidth={1.5}
          />
        </div>
      ) : null}
      <h3 className="font-heading font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
