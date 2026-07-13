import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@polaris/ui/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

import { db } from "@polaris/db";
import { users } from "@polaris/db/schema";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@polaris/ui/components/ui/sidebar";
import { eq } from "drizzle-orm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { AdminSidebar } from "../components/admin-sidebar";

export const metadata: Metadata = {
  title: "Polaris Admin",
  description: "Painel interno da plataforma Polaris.",
};

const getAdminContext = async () => {
  try {
    return await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

async function AdminAppWrapper({ children }: { children: ReactNode }) {
  let adminContext: Awaited<ReturnType<typeof getAdminContext>> | undefined;
  let userName = "Administrador";

  try {
    adminContext = await getAdminContext();
    if (adminContext?.userId) {
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, adminContext.userId),
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
        <div className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={cn(
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable
      )}
      lang="pt-BR"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <TooltipProvider>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                Carregando...
              </div>
            }
          >
            <AdminAppWrapper>{children}</AdminAppWrapper>
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
