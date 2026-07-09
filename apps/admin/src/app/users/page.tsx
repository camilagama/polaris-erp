import { listPlatformUsers } from "@polaris/platform/directory";
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
    await requirePlatformAdmin();
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
  await guardPlatformAdmin();

  const query = await getQuery(searchParams);
  const users = await listPlatformUsers(query);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-500 hover:text-zinc-200" href="/">
            Voltar
          </Link>
          <h1 className="mt-2 font-semibold text-2xl tracking-normal">
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Busca global read-only com emails e sessoes redigidos.
          </p>
        </div>
        <search className="w-full max-w-md">
          <form className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              defaultValue={query}
              name="q"
              placeholder="Nome, email ou ID"
            />
            <button
              className="rounded-md border border-zinc-700 px-4 py-2 font-medium text-sm text-zinc-100 hover:border-zinc-500"
              type="submit"
            >
              Buscar
            </button>
          </form>
        </search>
      </div>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.7fr_1fr] gap-4 border-zinc-800 border-b px-4 py-3 text-xs text-zinc-500 uppercase">
          <span>Usuario</span>
          <span>Email redigido</span>
          <span>Orgs</span>
          <span>Sessoes</span>
          <span>Providers</span>
        </div>
        {users.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhum usuario encontrado.
          </p>
        ) : (
          users.map((user) => (
            <Link
              className="grid grid-cols-[1.3fr_1fr_0.7fr_0.7fr_1fr] gap-4 border-zinc-800 border-b px-4 py-3 text-sm hover:bg-zinc-800/40"
              href={`/users/${user.id}`}
              key={user.id}
              prefetch={false}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-100">
                  {user.name}
                </span>
                <span className="block truncate text-zinc-500">{user.id}</span>
              </span>
              <span className="truncate text-zinc-300">{user.email}</span>
              <span className="text-zinc-300">
                {formatNumber(user.organizationCount)}
              </span>
              <span className="text-zinc-300">
                {formatNumber(user.sessionCount)}
              </span>
              <span className="truncate text-zinc-400">
                {user.providerIds.join(", ") || "Nenhum"}
              </span>
            </Link>
          ))
        )}
      </section>

      <p className="text-xs text-zinc-600">
        Ultima sessao exibida apenas como data:{" "}
        {users[0] ? formatDateTime(users[0].latestSessionAt) : "Sem dados"}
      </p>
    </section>
  );
};

const UsersFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-sm text-zinc-500">Carregando usuarios...</p>
  </section>
);

export default function UsersPage(props: UsersPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<UsersFallback />}>
        <UsersContent {...props} />
      </Suspense>
    </main>
  );
}
