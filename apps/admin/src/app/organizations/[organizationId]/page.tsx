import { getPlatformOrganizationDetail } from "@polaris/platform/directory";
import { listPlatformSupportNotes } from "@polaris/platform/support-notes";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { createSupportNoteAction } from "../../support-notes/actions";
import { changeOrganizationStatusAction } from "../actions";

interface OrganizationDetailPageProps {
  params: Promise<{ organizationId: string }>;
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

const OrganizationDetailContent = async ({
  params,
}: OrganizationDetailPageProps) => {
  await connection();
  await guardPlatformAdmin();

  const { organizationId } = await params;
  const [organization, supportNotes] = await Promise.all([
    getPlatformOrganizationDetail(organizationId),
    listPlatformSupportNotes({ organizationId }),
  ]);

  if (!organization) {
    notFound();
  }

  const counts = [
    { label: "Membros", value: organization.counts.members },
    { label: "Produtos", value: organization.counts.products },
    { label: "Vendas", value: organization.counts.sales },
    {
      label: "Sessoes ativas/recentes",
      value: organization.sessionSummary.count,
    },
  ] as const;
  const nextStatus = organization.status === "active" ? "suspended" : "active";
  const submitLabel =
    nextStatus === "suspended"
      ? "Suspender organizacao"
      : "Reativar organizacao";

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div>
        <Link
          className="text-sm text-zinc-500 hover:text-zinc-200"
          href="/organizations"
        >
          Voltar
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-normal">
              {organization.id}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {organization.primaryMemberEmail ?? "Sem email principal"}
            </p>
          </div>
          <span className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
            {organization.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            Ultima criada:{" "}
            {formatDateTime(organization.sessionSummary.latestCreatedAt)}
          </p>
          <p>
            Ultima expiracao:{" "}
            {formatDateTime(organization.sessionSummary.latestExpiresAt)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Status da organizacao
        </h2>
        <form
          action={changeOrganizationStatusAction}
          className="mt-4 grid gap-4"
        >
          <input name="organizationId" type="hidden" value={organization.id} />
          <input name="status" type="hidden" value={nextStatus} />
          <label className="grid gap-2 text-sm text-zinc-300">
            Motivo obrigatorio
            <textarea
              className="min-h-24 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              name="reason"
              placeholder="Explique o motivo operacional da mudanca"
              required
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-zinc-400">
            <input className="mt-1" name="confirm" required type="checkbox" />
            Confirmo que esta mudanca afeta o acesso operacional da organizacao
            e sera auditada.
          </label>
          <button
            className="w-fit rounded-md border border-amber-600 px-4 py-2 font-medium text-amber-200 text-sm hover:border-amber-400"
            type="submit"
          >
            {submitLabel}
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="grid min-w-[720px] grid-cols-[1.3fr_1fr_0.7fr_0.9fr] gap-4 border-zinc-800 border-b px-4 py-3 text-xs text-zinc-500 uppercase">
          <span>Membro</span>
          <span>Email redigido</span>
          <span>Role</span>
          <span>Providers</span>
        </div>
        {organization.members.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhum membro encontrado.
          </p>
        ) : (
          organization.members.map((member) => (
            <Link
              className="grid min-w-[720px] grid-cols-[1.3fr_1fr_0.7fr_0.9fr] gap-4 border-zinc-800 border-b px-4 py-3 text-sm hover:bg-zinc-800/40"
              href={`/users/${member.userId}`}
              key={member.userId}
              prefetch={false}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-100">
                  {member.name}
                </span>
                <span className="block truncate text-zinc-500">
                  {member.userId}
                </span>
              </span>
              <span className="truncate text-zinc-300">{member.email}</span>
              <span className="text-zinc-300">{member.role}</span>
              <span className="truncate text-zinc-400">
                {member.providerIds.join(", ") || "Nenhum"}
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
          <input name="organizationId" type="hidden" value={organization.id} />
          <textarea
            aria-label="Adicionar nota interna da organizacao"
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

const OrganizationDetailFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-sm text-zinc-500">Carregando organizacao...</p>
  </section>
);

export default function OrganizationDetailPage(
  props: OrganizationDetailPageProps
) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<OrganizationDetailFallback />}>
        <OrganizationDetailContent {...props} />
      </Suspense>
    </main>
  );
}
