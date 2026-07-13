"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "../ui/sidebar";

export interface NavigationItem {
  href: string;
  // biome-ignore lint/suspicious/noExplicitAny: Hugeicons doesn't export a convenient type for this
  icon: any;
  label: string;
}

export type BaseSidebarProps = ComponentProps<typeof Sidebar> & {
  logo?: React.ReactNode;
  brandName?: string;
  navigationItems: NavigationItem[];
  user: {
    email?: string;
    image?: string | null;
    name: string;
    role?: string;
  };
  onSignOut?: () => void;
};

const getUserInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function BaseSidebar({
  logo,
  brandName = "Polaris.",
  navigationItems,
  user,
  onSignOut,
  ...props
}: BaseSidebarProps) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const initials = getUserInitials(user.name);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex h-16 items-center px-4 pt-5">
        {state === "expanded" ? (
          <Link
            className="flex w-full items-center gap-3 font-medium text-base text-foreground uppercase tracking-[0.24em]"
            href="/"
          >
            {logo && <span className="shrink-0">{logo}</span>}
            <span className="truncate">{brandName}</span>
          </Link>
        ) : (
          <Link className="flex w-full items-center" href="/" title={brandName}>
            {logo && <span className="shrink-0">{logo}</span>}
          </Link>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navigationItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname?.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        active &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      )}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="rounded-sm" size="lg">
                  <Avatar className="size-8 rounded-full">
                    {user.image ? (
                      <AvatarImage
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        src={user.image}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-muted-foreground/10">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    {user.email && (
                      <span className="truncate text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      {user.image ? (
                        <AvatarImage
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          src={user.image}
                        />
                      ) : null}
                      <AvatarFallback className="rounded-lg bg-muted-foreground/10">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.name}
                      </span>
                      {user.email && (
                        <span className="truncate text-muted-foreground text-xs">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                {onSignOut && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={onSignOut}
                      variant="destructive"
                    >
                      <HugeiconsIcon
                        className="mr-2 size-4"
                        icon={Logout01Icon}
                      />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
