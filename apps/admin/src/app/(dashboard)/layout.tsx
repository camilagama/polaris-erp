import { db } from "@polaris/db";
import { adminUsers } from "@polaris/db/schema";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@polaris/ui/components/ui/sidebar";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { signOutAction } from "@/features/auth/actions";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { getSession } from "@/lib/session";
import { AdminSidebar } from "../../components/admin-sidebar";
import { AdminThemeToggle } from "../../components/admin-theme-toggle";

async function AdminAppWrapper({ children }: { children: ReactNode }) {
  const adminContext = await requirePlatformAdmin();
  const session = await getSession();
  let userName = "Administrador";
  let userEmail = "";
  let userImage: string | null = null;

  if (session?.user) {
    userName = session.user.name;
    userEmail = session.user.email;
    userImage = session.user.image ?? null;
  }

  const userRecord = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, adminContext.adminUserId),
  });
  if (userRecord?.name) {
    userName = userRecord.name;
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        onSignOut={signOutAction}
        user={{
          email: userEmail,
          image: userImage,
          name: userName,
          role: adminContext.role,
          platformAdminId: adminContext.platformAdminId,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-border/60 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <div className="ml-1 min-w-0 flex-1 sm:ml-2">
            <p className="truncate font-semibold text-sm sm:text-base">
              Polaris Admin
            </p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Console operacional
            </p>
          </div>
          <AdminThemeToggle />
        </header>
        <div className="mx-auto flex w-full max-w-[1650px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Carregando...
        </div>
      }
    >
      <AdminAppWrapper>{children}</AdminAppWrapper>
    </Suspense>
  );
}
