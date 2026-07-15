"use client";

import { useState } from "react";
import { Button } from "../ui/button";

export interface CollapsibleAnalyticsSectionProps {
  children: React.ReactNode;
  description: string;
  title?: string;
}

export function CollapsibleAnalyticsSection({
  children,
  description,
  title = "Analytics",
}: CollapsibleAnalyticsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading font-semibold text-xl tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button
          className="md:hidden"
          onClick={() => setExpanded((current) => !current)}
          size="sm"
          type="button"
          variant="outline"
        >
          {expanded ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      <div className={expanded ? "grid gap-4" : "hidden md:grid md:gap-4"}>
        {children}
      </div>
    </div>
  );
}
