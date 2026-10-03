"use client";

import { Search02Icon } from "@hugeicons/core-free-icons";
import { DataTable } from "@polaris/ui/components/shared/data-table";
import { TimeValue } from "@polaris/ui/components/shared/time-value";
import { Button } from "@polaris/ui/components/ui/button";
import { Empty } from "@polaris/ui/components/ui/empty";
import { formatNumber } from "@polaris/ui/lib/formatters";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

interface OrganizationDto {
  counts: {
    members: number;
    products: number;
  };
  createdAt: Date | string | null;
  id: string;
  primaryMemberEmail: string | null;
  status: string;
}

const columns: ColumnDef<OrganizationDto>[] = [
  {
    accessorKey: "id",
    header: "Tenant",
    cell: ({ row }) => {
      const org = row.original;
      return (
        <>
          <span className="block truncate font-medium text-foreground">
            {org.id}
          </span>
          <span className="block truncate text-muted-foreground">
            {org.primaryMemberEmail ?? "Sem email principal"}
          </span>
        </>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "counts.members",
    header: "Membros",
    cell: ({ row }) => formatNumber(row.original.counts.members),
  },
  {
    accessorKey: "counts.products",
    header: "Produtos",
    cell: ({ row }) => formatNumber(row.original.counts.products),
  },
  {
    accessorKey: "createdAt",
    header: "Criada em",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        <TimeValue kind="instant" value={row.original.createdAt} />
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Ação</div>,
    cell: ({ row }) => {
      const org = row.original;
      return (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link href={`/organizations/${org.id}`} prefetch={false}>
              Detalhes
            </Link>
          </Button>
        </div>
      );
    },
  },
];

export function OrganizationsTable({ data }: { data: OrganizationDto[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <Empty
          className="border-none shadow-none"
          description="Nenhuma organização encontrada com os critérios fornecidos."
          icon={Search02Icon}
          title="Nenhum tenant encontrado"
        />
      </div>
    );
  }

  return <DataTable columns={columns} data={data} />;
}
