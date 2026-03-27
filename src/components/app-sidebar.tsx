"use client";

import {
  Contact01Icon,
  DragDropIcon,
  File02Icon,
  Home01Icon,
  Layers01Icon,
  Logout01Icon,
  Settings01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const DGImportsLogo = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="oklch(0.505 0.213 27.518)" height="64" rx="12" width="64" />
    <path
      d="M14 32c0-10 8-18 18-18s18 8 18 18-8 18-18 18-18-8-18-18zm12 0c0 3.3 2.7 6 6 6s6-2.7 6-6-2.7-6-6-6-6 2.7-6 6z"
      fill="white"
    />
  </svg>
);

const navigationItems = [
  { href: "/", label: "Início", icon: Home01Icon },
  { href: "/vendas", label: "Vendas", icon: DragDropIcon },
  { href: "/clientes", label: "Clientes", icon: Contact01Icon },
  { href: "/produtos", label: "Produtos", icon: File02Icon },
  { href: "/categorias", label: "Categorias", icon: Layers01Icon },
  { href: "/configuracoes", label: "Configurações", icon: Settings01Icon },
] as const;

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();

  const user = {
    name: "Administrador",
    email: "admin@dgimports.com",
    avatar: "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex h-16 items-center px-4 pt-5">
        {state === "expanded" ? (
          <Link
            className="flex w-full items-center gap-3 font-medium text-base text-foreground uppercase tracking-[0.24em]"
            href="/"
          >
            <DGImportsLogo className="size-6 shrink-0" />
            <span className="truncate">DG Imports.</span>
          </Link>
        ) : (
          <Link
            className="flex w-full items-center"
            href="/"
            title="DG Imports."
          >
            <DGImportsLogo className="size-6 shrink-0" />
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
                        "transition-all hover:bg-muted/50 hover:text-foreground [&_svg]:size-4.5",
                        active
                          ? "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                          : "text-muted-foreground"
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
                <SidebarMenuButton
                  className="rounded-sm data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  size="lg"
                >
                  <Avatar className="size-8 rounded-full">
                    <AvatarImage alt={user.name} src={user.avatar} />
                    <AvatarFallback className="rounded-full bg-muted-foreground/10">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
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
                      <AvatarImage alt={user.name} src={user.avatar} />
                      <AvatarFallback className="rounded-lg bg-muted-foreground/10">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.name}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <HugeiconsIcon
                      className="mr-2 size-4"
                      icon={UserCircleIcon}
                    />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HugeiconsIcon
                      className="mr-2 size-4"
                      icon={Settings01Icon}
                    />
                    Configurações
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                  <HugeiconsIcon className="mr-2 size-4" icon={Logout01Icon} />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
