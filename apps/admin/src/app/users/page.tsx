import { listPlatformUsersForAdmin } from "@polaris/platform/directory";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

interface UsersPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

const getQuery = async (
  searchParams: UsersPageProps["searchParams"]
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

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const UsersContent = async ({ searchParams }: UsersPageProps) => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const query = await getQuery(searchParams);
  const users = await listPlatformUsersForAdmin(
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
            Usuarios
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Busca global read-only com emails e sessoes redigidos.
          </p>
        </div>
        <search className="w-full max-w-md">
          <form className="flex gap-2">
            <input
              aria-label="Buscar usuarios"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              defaultValue={query}
              name="q"
              placeholder="Nome, email ou ID"
            />
            <button
              className="rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm hover:border-muted-foreground"
              type="submit"
            >
              Buscar
            </button>
          </form>
        </search>
      </div>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="grid w-full min-w-[760px] grid-cols-[1.3fr_1fr_0.7fr_0.7fr_1fr] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase">
          <span>Usuario</span>
          <span>Email redigido</span>
          <span>Orgs</span>
          <span>Sessoes</span>
          <span>Providers</span>
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhum usuario encontrado.
          </p>
        ) : (
          users.map((user) => (
            <Link
              className="grid w-full min-w-[760px] grid-cols-[1.3fr_1fr_0.7fr_0.7fr_1fr] gap-4 border-border border-b px-4 py-3 text-sm hover:bg-muted/50"
              href={`/users/${user.id}`}
              key={user.id}
              prefetch={false}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {user.name}
                </span>
                <span className="block truncate text-muted-foreground">
                  {user.id}
                </span>
              </span>
              <span className="truncate text-foreground">{user.email}</span>
              <span className="text-foreground">
                {formatNumber(user.organizationCount)}
              </span>
              <span className="text-foreground">
                {formatNumber(user.sessionCount)}
              </span>
              <span className="truncate text-muted-foreground">
                {user.providerIds.join(", ") || "Nenhum"}
              </span>
            </Link>
          ))
        )}
      </section>

      <p className="text-muted-foreground text-xs">
        Ultima sessao exibida apenas como data:{" "}
        {users[0] ? formatDateTime(users[0].latestSessionAt) : "Sem dados"}
      </p>
    </section>
  );
};

const UsersFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
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
