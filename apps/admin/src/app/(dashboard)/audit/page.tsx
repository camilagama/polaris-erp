import { listPlatformAuditEventsForAdmin } from "@polaris/platform/audit-events";
import {
  BusinessTimeZoneNotice,
  TimeValue,
} from "@polaris/ui/components/shared/time-value";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
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

// biome-ignore-start lint/a11y/noNoninteractiveTabindex: Axe confirms keyboard access is required for horizontal table scrolling.
const AuditTableScrollRegion = ({ children }: { children: ReactNode }) => (
  <section
    aria-label="Eventos de auditoria da plataforma"
    className="overflow-x-auto rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    tabIndex={0}
  >
    {children}
  </section>
);
// biome-ignore-end lint/a11y/noNoninteractiveTabindex: Axe confirms keyboard access is required for horizontal table scrolling.
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
          <BusinessTimeZoneNotice />
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

      <AuditTableScrollRegion>
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <caption className="sr-only">
            Eventos de auditoria da plataforma
          </caption>
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
            <tr className="border-border border-b">
              <th className="px-4 py-3 text-left" scope="col">
                Action
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                Subject
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                Actor admin
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                Actor user
              </th>
              <th className="px-4 py-3 text-left" scope="col">
                Data e hora
              </th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum evento encontrado.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  className="border-border border-b hover:bg-muted/50"
                  key={event.id}
                >
                  <th
                    className="px-4 py-3 text-left font-medium text-foreground"
                    scope="row"
                  >
                    {event.action}
                  </th>
                  <td className="min-w-0 px-4 py-3 text-foreground">
                    <span className="block truncate">{event.subjectType}</span>
                    <span className="block truncate text-muted-foreground">
                      {event.subjectId ?? "sem subject"}
                    </span>
                  </td>
                  <td className="truncate px-4 py-3 text-muted-foreground">
                    {event.actorPlatformAdminId ?? "sem admin"}
                  </td>
                  <td className="truncate px-4 py-3 text-muted-foreground">
                    {event.actorAdminUserId ?? "sem user"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <TimeValue kind="instant" value={event.createdAt} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AuditTableScrollRegion>
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
