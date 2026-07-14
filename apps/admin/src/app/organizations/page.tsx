import { Search02Icon } from "@hugeicons/core-free-icons";
import { listPlatformOrganizationsForAdmin } from "@polaris/platform/directory";
import { Button } from "@polaris/ui/components/ui/button";
import { Empty } from "@polaris/ui/components/ui/empty";
import { Input } from "@polaris/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polaris/ui/components/ui/table";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

interface OrganizationsPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

const getQuery = async (
  searchParams: OrganizationsPageProps["searchParams"]
): Promise<string> => {
  const query = (await searchParams).q;

  return typeof query === "string" ? query : "";
};

const guardPlatformAdmin = async () => {
  try {
    return await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

const formatDate = (value: string | null) => {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const OrganizationsContent = async ({
  searchParams,
}: OrganizationsPageProps) => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const query = await getQuery(searchParams);
  const organizations = await listPlatformOrganizationsForAdmin(
    platformAdmin.platformAdminId,
    query
  );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/"
          >
            Voltar
          </Link>
          <h1 className="mt-2 font-semibold text-2xl tracking-normal">
            Tenants
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Busca global read-only por ID técnico ou email de membro.
          </p>
        </div>
        <search className="w-full max-w-md">
          <form className="flex gap-2">
            <Input
              aria-label="Buscar organizações"
              className="flex-1"
              defaultValue={query}
              name="q"
              placeholder="ID ou email"
            />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
        </search>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="pr-4 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="h-48 text-center" colSpan={6}>
                  <Empty
                    className="border-none shadow-none"
                    description="Nenhuma organização encontrada com os critérios fornecidos."
                    icon={Search02Icon}
                    title="Nenhum tenant encontrado"
                  />
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => (
                <TableRow
                  className="group transition-colors"
                  key={organization.id}
                >
                  <TableCell className="pl-4">
                    <span className="block truncate font-medium text-foreground">
                      {organization.id}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {organization.primaryMemberEmail ?? "Sem email principal"}
                    </span>
                  </TableCell>
                  <TableCell>{organization.status}</TableCell>
                  <TableCell>
                    {formatNumber(organization.counts.members)}
                  </TableCell>
                  <TableCell>
                    {formatNumber(organization.counts.products)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(organization.createdAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/organizations/${organization.id}`}
                        prefetch={false}
                      >
                        Detalhes
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const OrganizationsFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-muted-foreground text-sm">Carregando organizações...</p>
  </section>
);

export default function OrganizationsPage(props: OrganizationsPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<OrganizationsFallback />}>
        <OrganizationsContent {...props} />
      </Suspense>
    </main>
  );
}
