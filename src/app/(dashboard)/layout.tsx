import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-border/40 border-b px-4 group-has-data-[variant=inset]/sidebar-wrapper:bg-background">
          <SidebarTrigger />
          <div className="flex-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-background p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
