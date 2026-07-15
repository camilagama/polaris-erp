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
import { getPlatformAdminContext } from "@/lib/platform-admin-auth";
import { AdminSidebar } from "../../components/admin-sidebar";

const getAdminContext = async () => {
  try {
    return await getPlatformAdminContext();
  } catch {
    return null;
  }
};

async function AdminAppWrapper({ children }: { children: ReactNode }) {
  let adminContext: Awaited<ReturnType<typeof getAdminContext>> | undefined;
  let userName = "Administrador";

  try {
    adminContext = await getAdminContext();
    if (adminContext?.adminUserId) {
      const userRecord = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, adminContext.adminUserId),
      });
      if (userRecord?.name) {
        userName = userRecord.name;
      }
    }
  } catch {
    // Will be handled by page.tsx or forbidden
  }

  if (!adminContext) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{
          name: userName,
          role: adminContext.role,
          platformAdminId: adminContext.platformAdminId,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-border/60 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <SidebarTrigger />
          <div className="ml-3 min-w-0 sm:ml-4">
            <p className="truncate font-semibold text-sm sm:text-base">
              Polaris Admin
            </p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Console operacional
            </p>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
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
