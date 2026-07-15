"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface PageHeaderProps {
  backLink?: {
    href: string;
    label?: string;
  };
  children?: ReactNode;
  className?: string;
  description?: string;
  title: string;
}

export function PageHeader({
  backLink,
  children,
  className,
  description,
  title,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        {backLink ? (
          <Link
            className="mb-1 text-muted-foreground text-sm hover:text-foreground"
            href={backLink.href}
          >
            {backLink.label ?? "Voltar"}
          </Link>
        ) : null}
        <h1 className="font-heading font-semibold text-2xl tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>

      {children ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80 lg:items-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}
