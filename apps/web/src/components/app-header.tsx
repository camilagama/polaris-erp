"use client";

import { ThemeToggle } from "@polaris/ui/components/shared/theme-toggle";
import { Separator } from "@polaris/ui/components/ui/separator";
import { SidebarTrigger } from "@polaris/ui/components/ui/sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 shrink-0 border-border/60 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[1650px] items-center px-4 sm:px-6">
        <SidebarTrigger />
        <Separator className="h-4" orientation="vertical" />
        <div className="ml-1 min-w-0 flex-1 sm:ml-2">
          <AppBreadcrumb />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
