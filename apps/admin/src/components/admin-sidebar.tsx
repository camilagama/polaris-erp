"use client";

import {
  Activity01Icon,
  Home01Icon,
  Invoice01Icon,
  SecurityIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { BaseSidebar } from "@polaris/ui/components/shared/base-sidebar";
import { DGImportsLogo } from "@polaris/ui/components/ui/svgs/logo";
import type { ComponentProps } from "react";

const adminNavigationItems = [
  {
    href: "/",
    icon: Home01Icon,
    label: "Dashboard",
  },
  {
    href: "/organizations",
    icon: UserGroupIcon, // Approximation, adjust icon if needed
    label: "Organizações",
  },
  {
    href: "/users",
    icon: UserGroupIcon, // Approximation
    label: "Usuários",
  },
  {
    href: "/audit",
    icon: SecurityIcon, // Approximation
    label: "Auditoria",
  },
  {
    href: "/events",
    icon: Activity01Icon, // Approximation
    label: "Eventos",
  },
  {
    href: "/billing",
    icon: Invoice01Icon,
    label: "Billing",
  },
];

type AdminSidebarProps = Omit<
  ComponentProps<typeof BaseSidebar>,
  "navigationItems"
> & {
  user: {
    name: string;
    role: string;
    platformAdminId: string;
  };
};

export function AdminSidebar({ user, ...props }: AdminSidebarProps) {
  // In Admin, everyone uses the same routes for now, as we check roles at the page level
  return (
    <BaseSidebar
      {...props}
      brandName="Polaris Admin"
      logo={<DGImportsLogo className="size-6" />}
      navigationItems={adminNavigationItems}
      user={{
        name: user.name,
        role: user.role,
      }}
    />
  );
}
