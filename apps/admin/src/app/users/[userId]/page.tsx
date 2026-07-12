import { getPlatformUserDetail } from "@polaris/platform/directory";
import { listPlatformSupportNotes } from "@polaris/platform/support-notes";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { createSupportNoteAction } from "../../support-notes/actions";

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

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

const UserDetailContent = async ({ params }: UserDetailPageProps) => {
  await connection();
  await guardPlatformAdmin();

  const { userId } = await params;
  const [user, supportNotes] = await Promise.all([
    getPlatformUserDetail(userId),
    listPlatformSupportNotes({ customerUserId: userId }),
  ]);

  if (!user) {
    notFound();
  }

  const counts = [
    { label: "Organizacoes", value: user.organizationCount },
    { label: "Sessoes", value: user.sessionSummary.count },
    { label: "Providers", value: user.providerIds.length },
  ] as const;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div>
        <Link
          className="text-sm text-zinc-500 hover:text-zinc-200"
          href="/users"
        >
          Voltar
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-normal">
              {user.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
          </div>
          <span className="rounded-md border border-zinc-800 px-3 py-2 font-mono text-sm text-zinc-300">
            {user.id.slice(0, 12)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {counts.map((item) => (
          <article
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            key={item.label}
          >
            <h2 className="font-medium text-sm text-zinc-500 tracking-normal">
              {item.label}
            </h2>
            <p className="mt-3 font-semibold text-2xl tracking-normal">
              {formatNumber(item.value)}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Sessoes redigidas
        </h2>
        <div className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
          <p>
            Ultima criada: {formatDateTime(user.sessionSummary.latestCreatedAt)}
          </p>
          <p>
            Ultima expiracao:{" "}
            {formatDateTime(user.sessionSummary.latestExpiresAt)}
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="grid min-w-[720px] grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-zinc-800 border-b px-4 py-3 text-xs text-zinc-500 uppercase">
          <span>Tenant</span>
          <span>Status</span>
          <span>Role</span>
          <span>Membro desde</span>
        </div>
        {user.organizations.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhum tenant encontrado.
          </p>
        ) : (
          user.organizations.map((organization) => (
            <Link
              className="grid min-w-[720px] grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-zinc-800 border-b px-4 py-3 text-sm hover:bg-zinc-800/40"
              href={`/organizations/${organization.id}`}
              key={organization.id}
              prefetch={false}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-100">
                  {organization.id}
                </span>
              </span>
              <span className="text-zinc-300">{organization.status}</span>
              <span className="text-zinc-300">{organization.role}</span>
              <span className="text-zinc-400">
                {formatDateTime(organization.createdAt)}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Notas internas
        </h2>
        <form action={createSupportNoteAction} className="mt-4 grid gap-3">
          <input name="customerUserId" type="hidden" value={user.id} />
          <textarea
            aria-label="Adicionar nota interna do usuario"
            className="min-h-24 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            name="body"
            placeholder="Adicionar contexto interno de suporte"
            required
          />
          <button
            className="w-fit rounded-md border border-zinc-700 px-4 py-2 font-medium text-sm text-zinc-100 hover:border-zinc-500"
            type="submit"
          >
            Salvar nota
          </button>
        </form>
        <div className="mt-5 grid gap-3">
          {supportNotes.length === 0 ? (
            <p className="rounded-md border border-zinc-800 px-3 py-4 text-sm text-zinc-500">
              Nenhuma nota interna.
            </p>
          ) : (
            supportNotes.map((note) => (
              <article
                className="rounded-md border border-zinc-800 px-3 py-3"
                key={note.id}
              >
                <p className="whitespace-pre-wrap text-sm text-zinc-200">
                  {note.body}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {formatDateTime(note.createdAt)} -{" "}
                  {note.authorPlatformAdminId?.slice(0, 8) ?? "sem autor"}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
};

const UserDetailFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-sm text-zinc-500">Carregando usuario...</p>
  </section>
);

export default function UserDetailPage(props: UserDetailPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<UserDetailFallback />}>
        <UserDetailContent {...props} />
      </Suspense>
    </main>
  );
}
