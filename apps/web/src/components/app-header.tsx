"use client";

import { SidebarTrigger } from "@polaris/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  const pathname = usePathname();

  let title = "Polaris";
  let subtitle = "Conta individual protegida";

  if (pathname.startsWith("/produtos")) {
    title = "Produtos";
    subtitle = "Catálogo e gerencimento";
  } else if (pathname.startsWith("/vendas")) {
    title = "Vendas";
    subtitle = "Histórico e transações";
  } else if (pathname.startsWith("/estoque")) {
    title = "Estoque";
    subtitle = "Movimentações e inventário";
  } else if (pathname === "/") {
    title = "Dashboard";
    subtitle = "Visão geral da sua conta";
  }

  return (
    <header className="sticky top-0 z-10 shrink-0 border-border/60 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger />
        <div className="ml-1 min-w-0 flex-1 sm:ml-2">
          <p className="truncate font-semibold text-sm sm:text-base">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
