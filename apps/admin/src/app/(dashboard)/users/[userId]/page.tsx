import { getPlatformUserDetailForAdmin } from "@polaris/platform/directory";
import { listPlatformSupportCasesForAdmin } from "@polaris/platform/support-cases";
import { listPlatformSupportNotesForAdmin } from "@polaris/platform/support-notes";
import {
  BusinessTimeZoneNotice,
  TimeValue,
} from "@polaris/ui/components/shared/time-value";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import {
  createSupportCaseAction,
  updateSupportCaseAction,
} from "../../support-cases/actions";
import { createSupportNoteAction } from "../../support-notes/actions";

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

const guardPlatformAdmin = async () => requirePlatformAdmin();

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);

const UserDetailContent = async ({ params }: UserDetailPageProps) => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const { userId } = await params;
  const [user, supportCases, supportNotes] = await Promise.all([
    getPlatformUserDetailForAdmin(platformAdmin.platformAdminId, userId),
    listPlatformSupportCasesForAdmin(platformAdmin.platformAdminId, {
      customerUserId: userId,
    }),
    listPlatformSupportNotesForAdmin(platformAdmin.platformAdminId, {
      customerUserId: userId,
    }),
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
    <section className="grid gap-6">
      <div>
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/users"
        >
          Voltar
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-normal">
              {user.name}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">{user.email}</p>
          </div>
          <span className="rounded-md border border-border px-3 py-2 font-mono text-foreground text-sm">
            {user.id.slice(0, 12)}
          </span>
        </div>
      </div>

      <BusinessTimeZoneNotice />

      <div className="grid gap-4 md:grid-cols-3">
        {counts.map((item) => (
          <article
            className="rounded-lg border border-border bg-card p-4"
            key={item.label}
          >
            <h2 className="font-medium text-muted-foreground text-sm tracking-normal">
              {item.label}
            </h2>
            <p className="mt-3 font-semibold text-2xl tracking-normal">
              {formatNumber(item.value)}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Sessoes redigidas
        </h2>
        <div className="mt-4 grid gap-2 text-muted-foreground text-sm sm:grid-cols-2">
          <p>
            Ultima criada:{" "}
            <TimeValue
              kind="instant"
              value={user.sessionSummary.latestCreatedAt}
            />
          </p>
          <p>
            Ultima expiracao:{" "}
            <TimeValue
              kind="instant"
              value={user.sessionSummary.latestExpiresAt}
            />
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="grid w-full min-w-[720px] grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase">
          <span>Tenant</span>
          <span>Status</span>
          <span>Role</span>
          <span>Membro desde</span>
        </div>
        {user.organizations.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhum tenant encontrado.
          </p>
        ) : (
          user.organizations.map((organization) => (
            <Link
              className="grid w-full min-w-[720px] grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-border border-b px-4 py-3 text-sm hover:bg-muted/50"
              href={`/organizations/${organization.id}`}
              key={organization.id}
              prefetch={false}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {organization.id}
                </span>
              </span>
              <span className="text-foreground">{organization.status}</span>
              <span className="text-foreground">{organization.role}</span>
              <span className="text-muted-foreground">
                <TimeValue kind="instant" value={organization.createdAt} />
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Solicitação de titular
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Registra a solicitação para verificação manual. Este fluxo não exibe
          dados pessoais adicionais nem executa exclusão definitiva.
        </p>
        <form action={createSupportCaseAction} className="mt-4 grid gap-3">
          <input name="customerUserId" type="hidden" value={user.id} />
          <input name="kind" type="hidden" value="data_subject_request" />
          <label className="grid gap-2 text-foreground text-sm">
            Motivo obrigatório, sem dados pessoais desnecessários
            <textarea
              className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              name="reason"
              placeholder="Descreva a solicitação e o próximo passo de verificação manual"
              required
            />
          </label>
          <button
            className="w-fit rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm hover:border-muted-foreground"
            type="submit"
          >
            Registrar solicitação manual
          </button>
        </form>
        <div className="mt-4 grid gap-2">
          {supportCases.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma solicitação manual registrada.
            </p>
          ) : (
            supportCases.map((supportCase) => (
              <article
                className="rounded-md border border-border px-3 py-3 text-sm"
                key={supportCase.id}
              >
                <p>
                  {supportCase.kind === "data_subject_request"
                    ? "Solicitação de titular"
                    : "Caso de suporte"}
                  : {supportCase.status}
                </p>
                {supportCase.status === "closed" ? null : (
                  <form
                    action={updateSupportCaseAction}
                    className="mt-3 grid gap-2"
                  >
                    <input name="caseId" type="hidden" value={supportCase.id} />
                    <input
                      name="customerUserId"
                      type="hidden"
                      value={user.id}
                    />
                    <input name="status" type="hidden" value="closed" />
                    {supportCase.kind === "data_subject_request" ? (
                      <label className="flex items-start gap-2 text-muted-foreground text-xs">
                        <input
                          name="requesterVerified"
                          required
                          type="checkbox"
                        />
                        Confirmo que a identidade do titular foi verificada
                        manualmente.
                      </label>
                    ) : null}
                    <textarea
                      aria-label={`Resolução do caso ${supportCase.id}`}
                      className="min-h-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                      name="resolution"
                      placeholder="Resolução manual, sem PII desnecessária"
                      required
                    />
                    <button className="w-fit underline" type="submit">
                      Encerrar caso
                    </button>
                  </form>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-lg tracking-normal">
          Notas internas
        </h2>
        <form action={createSupportNoteAction} className="mt-4 grid gap-3">
          <input name="customerUserId" type="hidden" value={user.id} />
          <textarea
            aria-label="Adicionar nota interna do usuario"
            className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            name="body"
            placeholder="Adicionar contexto interno de suporte"
            required
          />
          <button
            className="w-fit rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm hover:border-muted-foreground"
            type="submit"
          >
            Salvar nota
          </button>
        </form>
        <div className="mt-5 grid gap-3">
          {supportNotes.length === 0 ? (
            <p className="rounded-md border border-border px-3 py-4 text-muted-foreground text-sm">
              Nenhuma nota interna.
            </p>
          ) : (
            supportNotes.map((note) => (
              <article
                className="rounded-md border border-border px-3 py-3"
                key={note.id}
              >
                <p className="whitespace-pre-wrap text-foreground text-sm">
                  {note.body}
                </p>
                <p className="mt-2 text-muted-foreground text-xs">
                  <TimeValue kind="instant" value={note.createdAt} /> -{" "}
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
  <section>
    <p className="text-muted-foreground text-sm">Carregando usuario...</p>
  </section>
);

export default function UserDetailPage(props: UserDetailPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<UserDetailFallback />}>
        <UserDetailContent {...props} />
      </Suspense>
    </main>
  );
}
