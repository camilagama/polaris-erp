import { listPlatformAuditEventsForAdmin } from "@polaris/platform/audit-events";
import { formatDateTime } from "@polaris/ui/lib/formatters";
import Link from "next/link";
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

const guardPlatformAdmin = async () => requirePlatformAdmin();

const getFilter = async (
  searchParams: AuditPageProps["searchParams"],
  key: "action" | "subjectId" | "subjectType"
): Promise<string> => {
  const value = (await searchParams)[key];

  return typeof value === "string" ? value : "";
};

const AuditContent = async ({ searchParams }: AuditPageProps) => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const [action, subjectType, subjectId] = await Promise.all([
    getFilter(searchParams, "action"),
    getFilter(searchParams, "subjectType"),
    getFilter(searchParams, "subjectId"),
  ]);
  const events = await listPlatformAuditEventsForAdmin(
    platformAdmin.platformAdminId,
    { action, subjectId, subjectType }
  );

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/"
          >
            Voltar
          </Link>
          <h1 className="mt-2 font-semibold text-2xl tracking-normal">
            Auditoria
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Eventos administrativos redigidos e filtraveis.
          </p>
        </div>
      </div>

      <search>
        <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            aria-label="Filtrar por action"
            className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            defaultValue={action}
            name="action"
            placeholder="Action"
          />
          <input
            aria-label="Filtrar por subject type"
            className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            defaultValue={subjectType}
            name="subjectType"
            placeholder="Subject type"
          />
          <input
            aria-label="Filtrar por subject ID"
            className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
            defaultValue={subjectId}
            name="subjectId"
            placeholder="Subject ID"
          />
          <button
            className="rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm hover:border-muted-foreground"
            type="submit"
          >
            Filtrar
          </button>
        </form>
      </search>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="grid w-full min-w-[780px] grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase">
          <span>Action</span>
          <span>Subject</span>
          <span>Actor admin</span>
          <span>Actor user</span>
          <span>Data</span>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhum evento encontrado.
          </p>
        ) : (
          events.map((event) => (
            <div
              className="grid w-full min-w-[780px] grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr] gap-4 border-border border-b px-4 py-3 text-sm"
              key={event.id}
            >
              <span className="truncate font-medium text-foreground">
                {event.action}
              </span>
              <span className="min-w-0 text-foreground">
                <span className="block truncate">{event.subjectType}</span>
                <span className="block truncate text-muted-foreground">
                  {event.subjectId ?? "sem subject"}
                </span>
              </span>
              <span className="truncate text-muted-foreground">
                {event.actorPlatformAdminId ?? "sem admin"}
              </span>
              <span className="truncate text-muted-foreground">
                {event.actorAdminUserId ?? "sem user"}
              </span>
              <span className="text-muted-foreground">
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
  <section>
    <p className="text-muted-foreground text-sm">Carregando auditoria...</p>
  </section>
);

export default function AuditPage(props: AuditPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<AuditFallback />}>
        <AuditContent {...props} />
      </Suspense>
    </main>
  );
}
