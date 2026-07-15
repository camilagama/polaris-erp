import { listPlatformOrganizationsForAdmin } from "@polaris/platform/directory";
import { PageHeader } from "@polaris/ui/components/shared/page-header";
import { Button } from "@polaris/ui/components/ui/button";
import { Input } from "@polaris/ui/components/ui/input";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { OrganizationsTable } from "./organizations-table";

interface OrganizationsPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

const getQuery = async (
  searchParams: OrganizationsPageProps["searchParams"]
): Promise<string> => {
  const query = (await searchParams).q;

  return typeof query === "string" ? query : "";
};

const guardPlatformAdmin = async () => requirePlatformAdmin();

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
      <PageHeader
        backLink={{ href: "/" }}
        description="Busca read-only por ID técnico, com dados pessoais redigidos."
        title="Tenants"
      >
        <search className="w-full">
          <form className="flex gap-2">
            <Input
              aria-label="Buscar organizacoes"
              className="flex-1 bg-background"
              defaultValue={query}
              name="q"
              placeholder="ID técnico"
            />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
        </search>
      </PageHeader>
      <OrganizationsTable data={organizations} />
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
