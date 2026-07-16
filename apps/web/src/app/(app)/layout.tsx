import {
  SidebarInset,
  SidebarProvider,
} from "@polaris/ui/components/ui/sidebar";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { signOutAction } from "@/features/auth/actions";
import { requirePageAppContext } from "@/lib/app-session";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();

  const [session, context] = await Promise.all([
    requireSession(),
    requirePageAppContext(),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        onSignOut={signOutAction}
        user={{
          email: session.user.email,
          image: session.user.image,
          name: session.user.name,
          role: context.role,
        }}
      />
      <SidebarInset>
        <AppHeader />
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
