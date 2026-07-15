import { getPlatformEventsOverviewForAdmin } from "@polaris/platform/events";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { retryOutboxEventAction } from "./actions";

const guardPlatformAdmin = async () => requirePlatformAdmin();

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

const canRetry = ({
  role,
  status,
}: {
  role: "operator" | "owner" | "support";
  status: string;
}): boolean =>
  role === "owner" && (status === "failed" || status === "dead_letter");

const EventsContent = async () => {
  await connection();
  const platformAdmin = await guardPlatformAdmin();

  const { outbox, webhooks } = await getPlatformEventsOverviewForAdmin(
    platformAdmin.platformAdminId
  );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
      <div>
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          Voltar
        </Link>
        <h1 className="mt-2 font-semibold text-2xl tracking-normal">Eventos</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Observabilidade basica de outbox e webhooks capturados.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">Outbox</h2>
        </div>
        {outbox.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhum evento de outbox.
          </p>
        ) : (
          outbox.map((event) => (
            <div
              className="grid gap-3 border-border border-b px-4 py-3 text-sm md:grid-cols-[1fr_0.8fr_0.7fr_0.8fr_auto]"
              key={event.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {event.topic}
                </span>
                <span className="block truncate text-muted-foreground">
                  {event.eventType}
                </span>
              </span>
              <span className="text-foreground">{event.status}</span>
              <span className="text-foreground">{event.attempts}</span>
              <span className="text-muted-foreground">
                {formatDateTime(event.availableAt)}
              </span>
              {canRetry({
                role: platformAdmin.role,
                status: event.status,
              }) ? (
                <form action={retryOutboxEventAction}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <label className="sr-only" htmlFor={`reason-${event.id}`}>
                    Motivo do retry
                  </label>
                  <input
                    className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                    id={`reason-${event.id}`}
                    maxLength={240}
                    name="reason"
                    placeholder="Motivo do retry, sem dados pessoais"
                    required
                  />
                  <button
                    className="rounded-md border border-border px-3 py-2 font-medium text-foreground text-sm hover:border-muted-foreground"
                    type="submit"
                  >
                    Retry
                  </button>
                </form>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {event.status === "failed" || event.status === "dead_letter"
                    ? "Aprovação de owner necessária"
                    : "Sem acao"}
                </span>
              )}
            </div>
          ))
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-normal">Webhooks</h2>
        </div>
        {webhooks.length === 0 ? (
          <p className="px-4 py-8 text-muted-foreground text-sm">
            Nenhum webhook capturado.
          </p>
        ) : (
          webhooks.map((event) => (
            <div
              className="grid gap-3 border-border border-b px-4 py-3 text-sm md:grid-cols-[1fr_1fr_0.7fr_0.8fr]"
              key={event.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {event.provider}
                </span>
                <span className="block truncate text-muted-foreground">
                  {event.providerEventId}
                </span>
              </span>
              <span className="truncate text-muted-foreground">
                {event.correlationId}
              </span>
              <span className="text-foreground">{event.status}</span>
              <span className="text-muted-foreground">
                {formatDateTime(event.receivedAt)}
              </span>
            </div>
          ))
        )}
      </section>
    </section>
  );
};

const EventsFallback = () => (
  <section className="mx-auto w-full max-w-6xl px-6 py-8">
    <p className="text-muted-foreground text-sm">Carregando eventos...</p>
  </section>
);

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<EventsFallback />}>
        <EventsContent />
      </Suspense>
    </main>
  );
}
