import { listPlatformUsersForAdmin } from "@polaris/platform/directory";
import { PageHeader } from "@polaris/ui/components/shared/page-header";
import { Button } from "@polaris/ui/components/ui/button";
import { Input } from "@polaris/ui/components/ui/input";
import { formatDateTime } from "@polaris/ui/lib/formatters";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { UsersTable } from "./users-table";

interface UsersPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

const getQuery = async (
  searchParams: UsersPageProps["searchParams"]
): Promise<string> => {
  const query = (await searchParams).q;

  return typeof query === "string" ? query : "";
};

const guardPlatformAdmin = async () => requirePlatformAdmin();

const UsersContent = async ({ searchParams }: UsersPageProps) => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const query = await getQuery(searchParams);
  const users = await listPlatformUsersForAdmin(
    platformAdmin.platformAdminId,
    query
  );

  return (
    <section className="grid gap-6">
      <PageHeader
        backLink={{ href: "/" }}
        description="Busca por ID técnico, com dados pessoais e sessões redigidos."
        title="Usuarios"
      >
        <search className="w-full">
          <form className="flex gap-2">
            <Input
              aria-label="Buscar usuarios"
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

      <UsersTable data={users} />

      <p className="text-muted-foreground text-xs">
        Ultima sessao exibida apenas como data:{" "}
        {users[0] ? formatDateTime(users[0].latestSessionAt) : "Sem dados"}
      </p>
    </section>
  );
};

const UsersFallback = () => (
  <section>
    <p className="text-muted-foreground text-sm">Carregando usuarios...</p>
  </section>
);

export default function UsersPage(props: UsersPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<UsersFallback />}>
        <UsersContent {...props} />
      </Suspense>
    </main>
  );
}
