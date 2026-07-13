"use client";

import {
  Home01Icon,
  Invoice01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { BaseSidebar } from "@polaris/ui/components/shared/base-sidebar";
import { DGImportsLogo } from "@polaris/ui/components/ui/svgs/logo";
import type { ComponentProps } from "react";
import { canRolePerform, type OrganizationRole } from "@/lib/app-context";

const allNavigationItems = [
  {
    href: "/",
    icon: Home01Icon,
    label: "Dashboard",
    permission: "analytics:read",
  },
  {
    href: "/produtos",
    icon: ShoppingBag01Icon,
    label: "Produtos",
    permission: "catalog:read",
  },
  {
    href: "/estoque",
    icon: ShoppingBag01Icon,
    label: "Estoque",
    permission: "catalog:read",
  },
  {
    href: "/vendas",
    icon: Invoice01Icon,
    label: "Vendas",
    permission: "catalog:read",
  },
  {
    href: "/configuracoes",
    icon: Settings01Icon,
    label: "Configuracoes",
    permission: "settings:write",
  },
] as const;

type AppSidebarProps = Omit<
  ComponentProps<typeof BaseSidebar>,
  "navigationItems" | "logo"
> & {
  onSignOut: () => Promise<void>;
  user: {
    email: string;
    image?: string | null;
    name: string;
    role: OrganizationRole;
  };
};

export function AppSidebar({ onSignOut, user, ...props }: AppSidebarProps) {
  const allowedNavigationItems = allNavigationItems.filter((item) =>
    // biome-ignore lint/suspicious/noExplicitAny: Temporary fix for dynamic permission matching
    canRolePerform(user.role, item.permission as any)
  );

  return (
    <BaseSidebar
      {...props}
      brandName="Polaris."
      logo={<DGImportsLogo className="size-6" />}
      navigationItems={allowedNavigationItems}
      onSignOut={onSignOut}
      user={user}
    />
  );
}
