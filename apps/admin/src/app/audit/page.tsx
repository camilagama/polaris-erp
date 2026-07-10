import { listPlatformAuditEvents } from "@polaris/platform/audit-events";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

interface AuditPageProps {
  searchParams: Promise<{
    action?: string | string[];
    subjectId?: string | string[];
    subjectType?: string | string[];
  }>;
}

const guardPlatformAdmin = async () => {
  try {
    await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

const getFilter = async (
  searchParams: AuditPageProps["searchParams"],
  key: "action" | "subjectId" | "subjectType"
): Promise<string> => {
  const value = (await searchParams)[key];

  return typeof value === "string" ? value : "";
};

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

const AuditContent = async ({ searchParams }: AuditPageProps) => {
  await connection();
  await guardPlatformAdmin();

  const [action, subjectType, subjectId] = await Promise.all([
    getFilter(searchParams, "action"),
    getFilter(searchParams, "subjectType"),
    getFilter(searchParams, "subjectId"),
  ]);
  const events = await listPlatformAuditEvents({
    action,
    subjectId,
    subjectType,
  });

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-zinc-500 hover:text-zinc-200" href="/">
            Voltar
          </Link>
          <h1 className="mt-2 font-semibold text-2xl tracking-normal">
            Auditoria
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Eventos administrativos redigidos e filtraveis.
          </p>
        </div>
      </div>

      <search>
        <form className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            aria-label="Filtrar por action"
            className="min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            defaultValue={action}
            name="action"
            placeholder="Action"
          />
          <input
            aria-label="Filtrar por subject type"
            className="min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            defaultValue={subjectType}
            name="subjectType"
            placeholder="Subject type"
          />
          <input
            aria-label="Filtrar por subject ID"
            className="min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            defaultValue={subjectId}
            name="subjectId"
            placeholder="Subject ID"
          />
          <button
            className="rounded-md border border-zinc-700 px-4 py-2 font-medium text-sm text-zinc-100 hover:border-zinc-500"
            type="submit"
          >
            Filtrar
          </button>
        </form>
      </search>

      <section className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="grid min-w-[780px] grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr] gap-4 border-zinc-800 border-b px-4 py-3 text-xs text-zinc-500 uppercase">
          <span>Action</span>
          <span>Subject</span>
          <span>Actor admin</span>
          <span>Actor user</span>
          <span>Data</span>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">
            Nenhum evento encontrado.
          </p>
        ) : (
          events.map((event) => (
            <div
              className="grid min-w-[780px] grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr] gap-4 border-zinc-800 border-b px-4 py-3 text-sm"
              key={event.id}
            >
              <span className="truncate font-medium text-zinc-100">
                {event.action}
              </span>
              <span className="min-w-0 text-zinc-300">
                <span className="block truncate">{event.subjectType}</span>
                <span className="block truncate text-zinc-500">
                  {event.subjectId ?? "sem subject"}
                </span>
              </span>
              <span className="truncate text-zinc-400">
                {event.actorPlatformAdminId ?? "sem admin"}
              </span>
              <span className="truncate text-zinc-400">
                {event.actorUserId ?? "sem user"}
              </span>
              <span className="text-zinc-400">
                {formatDateTime(event.createdAt)}
              </span>
            </div>
          ))
        )}
      </section>
    </section>
  );
};

const AuditFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-sm text-zinc-500">Carregando auditoria...</p>
  </section>
);

export default function AuditPage(props: AuditPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<AuditFallback />}>
        <AuditContent {...props} />
      </Suspense>
    </main>
  );
}
