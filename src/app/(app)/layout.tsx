import type { ReactNode } from "react";
import { signOutAction } from "@/app/(app)/actions";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <SidebarProvider>
      <AppSidebar
        onSignOut={signOutAction}
        user={{
          email: session.user.email,
          image: session.user.image,
          name: session.user.name,
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-border/60 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <div className="ml-3 min-w-0 sm:ml-4">
            <p className="truncate font-semibold text-sm sm:text-base">
              DG Imports
            </p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Operacao protegida e orientada a transacoes
            </p>
          </div>
        </header>
        <div className="flex flex-1 flex-col bg-background px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
