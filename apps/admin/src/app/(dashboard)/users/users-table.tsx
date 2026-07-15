"use client";

import { Search02Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@polaris/ui/components/shared/data-table";
import { Empty } from "@polaris/ui/components/ui/empty";
import { formatNumber } from "@polaris/ui/lib/formatters";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

interface UserDto {
  email: string;
  id: string;
  name: string;
  organizationCount: number;
  providerIds: string[];
  sessionCount: number;
}

const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: "name",
    header: "Usuario",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Link
          className="block truncate hover:text-primary hover:underline"
          href={`/users/${user.id}`}
          prefetch={false}
        >
          <span className="block truncate font-medium text-foreground">
            {user.name}
          </span>
          <span className="block truncate text-muted-foreground">
            {user.id}
          </span>
        </Link>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email redigido",
  },
  {
    accessorKey: "organizationCount",
    header: "Orgs",
    cell: ({ row }) => formatNumber(row.original.organizationCount),
  },
  {
    accessorKey: "sessionCount",
    header: "Sessoes",
    cell: ({ row }) => formatNumber(row.original.sessionCount),
  },
  {
    accessorKey: "providerIds",
    header: "Providers",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.providerIds.join(", ") || "Nenhum"}
      </span>
    ),
  },
];

export function UsersTable({ data }: { data: UserDto[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <Empty
          className="border-none shadow-none"
          description="Nenhum usuario encontrado."
          icon={Search02Icon}
          title="Nenhum usuario"
        />
      </div>
    );
  }

  return <DataTable columns={columns} data={data} />;
}
