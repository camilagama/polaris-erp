"use client";

import {
  Archive01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useTransition } from "react";
import { GoalFormDialog } from "@/components/settings/goal-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  archiveGoalAction,
  unarchiveGoalAction,
} from "@/features/goals/actions";
import {
  type DashboardGoalCard,
  type DashboardGoalHistoryItem,
  type GoalsSettingsPayload,
  MAX_ACTIVE_GOALS,
} from "@/features/goals/contracts";
import { formatCurrency } from "@/lib/formatters";

const metricShort = (metric: DashboardGoalCard["metric"]): string => {
  switch (metric) {
    case "profit": {
      return "Lucro";
    }
    case "revenue": {
      return "Receita";
    }
    case "sales_count": {
      return "Vendas";
    }
    default: {
      throw new Error("Metric de meta desconhecido.");
    }
  }
};

const historyStatusShort = (
  status: DashboardGoalHistoryItem["status"]
): string => {
  switch (status) {
    case "archived": {
      return "Arquivada";
    }
    case "completed": {
      return "Concluida";
    }
    case "expired": {
      return "Expirada";
    }
    default: {
      return status;
    }
  }
};

const fmtAmt = (
  metric: DashboardGoalHistoryItem["metric"],
  value: number
): string =>
  metric === "sales_count" ? `${Math.round(value)}` : formatCurrency(value);

const periodShort = (from: string, to: string): string =>
  `${format(parseISO(`${from}T12:00:00`), "dd/MM/yy", { locale: ptBR })}–${format(parseISO(`${to}T12:00:00`), "dd/MM/yy", { locale: ptBR })}`;

export function GoalsSettingsPanel({
  dateBounds,
  payload,
}: {
  dateBounds: { from: string; to: string };
  payload: GoalsSettingsPayload;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<DashboardGoalCard | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const atCapacity = payload.active.length >= MAX_ACTIVE_GOALS;

  const handleArchive = () => {
    if (!archiveId) {
      return;
    }

    startTransition(async () => {
      try {
        await archiveGoalAction({ id: archiveId });
        toast.success("Meta arquivada.");
        setArchiveId(null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel arquivar a meta."
        );
      }
    });
  };

  const handleUnarchive = (id: string) => {
    startTransition(async () => {
      try {
        await unarchiveGoalAction({ id });
        toast.success("Meta reativada.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel desarquivar a meta."
        );
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Metas</CardTitle>
              <CardDescription>
                {MAX_ACTIVE_GOALS === 1
                  ? "Resumo no dashboard. Limite: 1 meta ativa por vez."
                  : `Resumo no dashboard. Ate ${MAX_ACTIVE_GOALS} ativas.`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setHistoryOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                Ver historico
              </Button>
              <Button
                disabled={atCapacity}
                onClick={() => setCreateOpen(true)}
                size="sm"
                type="button"
                variant="default"
              >
                Nova meta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {payload.active.length === 0 ? (
              <div className="flex min-h-[86px] items-center gap-3.5 rounded-xl border border-dashed p-3">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-muted/50 p-2.5">
                  <HugeiconsIcon
                    className="text-muted-foreground/60"
                    icon={Target02Icon}
                    size={22}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-medium text-foreground text-sm">
                    Nenhuma meta ativa
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Voce ainda nao definiu nenhuma meta de vendas para a loja.
                  </p>
                </div>
              </div>
            ) : (
              payload.active.map((goal) => (
                <div
                  className="flex min-h-[86px] flex-col justify-center gap-2.5 rounded-xl border border-border/60 p-3.5"
                  key={goal.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500"
                            title="Meta ativa"
                          />
                          <p className="truncate font-medium">{goal.name}</p>
                        </div>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                          {metricShort(goal.metric)}
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                          {periodShort(goal.period.from, goal.period.to)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        onClick={() => setEditGoal(goal)}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Editar
                      </Button>
                      <Button
                        onClick={() => setArchiveId(goal.id)}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Arquivar
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-chart-6 transition-[width]"
                        style={{
                          width: `${Math.max(0, Math.min(100, goal.barPercent))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {fmtAmt(goal.metric, goal.actualValue)} /{" "}
                        {fmtAmt(goal.metric, goal.targetValue)}
                      </span>
                      <span className="font-medium text-foreground">
                        {goal.progressPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={setHistoryOpen} open={historyOpen}>
        <DialogContent
          className="max-h-[85vh] sm:max-w-4xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Historico de metas</DialogTitle>
            <DialogDescription>
              Lista de metas concluidas, expiradas e arquivadas.
            </DialogDescription>
          </DialogHeader>

          {payload.history.length === 0 ? (
            <div className="flex min-h-[86px] items-center gap-3.5 rounded-xl border border-dashed p-3">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-muted/50 p-2.5">
                <HugeiconsIcon
                  className="text-muted-foreground/60"
                  icon={Clock01Icon}
                  size={22}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium text-foreground text-sm">
                  Sem historico
                </h3>
                <p className="text-muted-foreground text-xs">
                  Nenhuma meta concluida ou arquivada no historico.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.status === "completed" && (
                            <HugeiconsIcon
                              className="size-3.5 text-emerald-500"
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2.5}
                            />
                          )}
                          {item.status === "archived" && (
                            <HugeiconsIcon
                              className="size-3.5 text-muted-foreground/80"
                              icon={Archive01Icon}
                              strokeWidth={2}
                            />
                          )}
                          {item.status === "expired" && (
                            <HugeiconsIcon
                              className="size-3.5 text-amber-500"
                              icon={Clock01Icon}
                              strokeWidth={2}
                            />
                          )}
                          <span className="text-xs">
                            {historyStatusShort(item.status)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {periodShort(item.period.from, item.period.to)}
                      </TableCell>
                      <TableCell>
                        {item.resolvedValue === null
                          ? "-"
                          : `${fmtAmt(item.metric, item.resolvedValue)} / ${fmtAmt(item.metric, item.targetValue)}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "archived" ? (
                          <Button
                            disabled={pending || atCapacity}
                            onClick={() => handleUnarchive(item.id)}
                            size="xs"
                            type="button"
                            variant="outline"
                          >
                            Desarquivar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GoalFormDialog
        dateBounds={dateBounds}
        mode="create"
        onOpenChange={setCreateOpen}
        open={createOpen}
      />

      {editGoal ? (
        <GoalFormDialog
          dateBounds={dateBounds}
          initialGoal={editGoal}
          key={editGoal.id}
          mode="edit"
          onOpenChange={(open) => {
            if (!open) {
              setEditGoal(null);
            }
          }}
          open
        />
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setArchiveId(null);
          }
        }}
        open={archiveId !== null}
      >
        <AlertDialogContent className="sm:max-w-115">
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar meta</AlertDialogTitle>
            <AlertDialogDescription>
              {MAX_ACTIVE_GOALS === 1
                ? "Sai das ativas. Para desarquivar, primeiro arquive ou encerre a meta que estiver ativa."
                : "Sai das ativas. Pode desarquivar depois se houver vaga."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                handleArchive();
              }}
            >
              {pending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
