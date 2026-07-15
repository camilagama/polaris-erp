import { DatabaseIcon, Link04Icon } from "@hugeicons/core-free-icons";
import { getPlatformEventsOverviewForAdmin } from "@polaris/platform/events";
import { PageHeader } from "@polaris/ui/components/shared/page-header";
import { Button } from "@polaris/ui/components/ui/button";
import { Empty } from "@polaris/ui/components/ui/empty";
import { Input } from "@polaris/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@polaris/ui/components/ui/table";
import { formatDateTime } from "@polaris/ui/lib/formatters";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import { retryOutboxEventAction } from "./actions";

const guardPlatformAdmin = async () => requirePlatformAdmin();

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
      <PageHeader
        backLink={{ href: "/" }}
        description="Observabilidade basica de outbox e webhooks capturados."
        title="Eventos"
      />

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-tight">Outbox</h2>
        </div>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Tópico</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead>Disponível em</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outbox.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="h-48 text-center" colSpan={5}>
                  <Empty
                    className="border-none shadow-none"
                    description="Nenhum evento de outbox pendente ou falho."
                    icon={DatabaseIcon}
                    title="Nenhum evento"
                  />
                </TableCell>
              </TableRow>
            ) : (
              outbox.map((event) => (
                <TableRow className="transition-colors" key={event.id}>
                  <TableCell className="pl-4">
                    <span className="block truncate font-medium text-foreground">
                      {event.topic}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {event.eventType}
                    </span>
                  </TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>{event.attempts}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(event.availableAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right align-top">
                    {canRetry({
                      role: platformAdmin.role,
                      status: event.status,
                    }) ? (
                      <form
                        action={retryOutboxEventAction}
                        className="flex flex-col items-end gap-2"
                      >
                        <input name="eventId" type="hidden" value={event.id} />
                        <Input
                          aria-label="Motivo do retry"
                          className="h-8 max-w-[200px] text-xs"
                          maxLength={240}
                          name="reason"
                          placeholder="Motivo do retry, sem dados pessoais"
                          required
                        />
                        <Button size="sm" type="submit" variant="secondary">
                          Retry
                        </Button>
                      </form>
                    ) : (
                      <span className="inline-block pt-2 text-muted-foreground text-xs">
                        {event.status === "failed" ||
                        event.status === "dead_letter"
                          ? "Aprovação necessária"
                          : "Sem ação"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-semibold text-lg tracking-tight">Webhooks</h2>
        </div>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Provider</TableHead>
              <TableHead>Correlação ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Recebido em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="h-48 text-center" colSpan={4}>
                  <Empty
                    className="border-none shadow-none"
                    description="Nenhum webhook capturado recentemente."
                    icon={Link04Icon}
                    title="Nenhum webhook"
                  />
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((event) => (
                <TableRow className="transition-colors" key={event.id}>
                  <TableCell className="pl-4">
                    <span className="block truncate font-medium text-foreground">
                      {event.provider}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {event.providerEventId}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.correlationId}
                  </TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    {formatDateTime(event.receivedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
