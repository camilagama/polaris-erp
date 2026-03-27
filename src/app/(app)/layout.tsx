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
          name: session.user.name,
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-border/60 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <div className="ml-4">
            <p className="font-semibold text-sm">DG Imports</p>
            <p className="text-muted-foreground text-xs">
              Operacao protegida e orientada a transacoes
            </p>
          </div>
        </header>
        <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklch,_var(--primary)_10%,_transparent),_transparent_28%)] p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
