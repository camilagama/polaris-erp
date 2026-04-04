"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveGoalAction,
  unarchiveGoalAction,
} from "@/app/(app)/metas/actions";
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
            <div className="space-y-1.5">
              <CardTitle>Metas</CardTitle>
              <CardDescription>
                Resumo no dashboard. Ate {MAX_ACTIVE_GOALS} ativas.
              </CardDescription>
            </div>
            <Button
              disabled={atCapacity}
              onClick={() => setCreateOpen(true)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Nova meta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="divide-y divide-border/60">
            {payload.active.length === 0 ? (
              <p className="py-3 text-muted-foreground text-sm">
                Nenhuma meta ativa.
              </p>
            ) : (
              payload.active.map((goal) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0"
                  key={goal.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{goal.name}</p>
                    <p className="truncate text-muted-foreground text-xs">
                      {metricShort(goal.metric)} ·{" "}
                      {periodShort(goal.period.from, goal.period.to)} ·{" "}
                      {fmtAmt(goal.metric, goal.targetValue)} ·{" "}
                      {goal.progressPercent.toFixed(0)}%
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      onClick={() => setEditGoal(goal)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => setArchiveId(goal.id)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      Arquivar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Historico
            </p>
            {payload.history.length === 0 ? (
              <p className="text-muted-foreground text-sm">Vazio.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {payload.history.map((item) => (
                  <div
                    className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 py-2.5 first:pt-0"
                    key={item.id}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {historyStatusShort(item.status)}
                        </span>
                      </p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground leading-snug">
                        {item.resolvedAt
                          ? `${format(parseISO(item.resolvedAt), "dd/MM/yy", { locale: ptBR })}`
                          : "—"}
                        {item.resolutionElapsedLabel
                          ? ` · ${item.resolutionElapsedLabel}`
                          : null}
                        {item.resolvedValue === null
                          ? null
                          : ` · ${fmtAmt(item.metric, item.resolvedValue)} / ${fmtAmt(item.metric, item.targetValue)}`}
                      </p>
                    </div>
                    {item.status === "archived" ? (
                      <Button
                        className="shrink-0"
                        disabled={pending || atCapacity}
                        onClick={() => handleUnarchive(item.id)}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Desarquivar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              Sai das ativas. Pode desarquivar depois se houver vaga.
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
