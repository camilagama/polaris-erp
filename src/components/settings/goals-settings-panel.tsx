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
import { Badge } from "@/components/ui/badge";
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

const metricLabel = (metric: DashboardGoalCard["metric"]): string => {
  switch (metric) {
    case "profit": {
      return "Lucro operacional";
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

const historyStatusLabel = (
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

const formatHistoryAmount = (
  metric: DashboardGoalHistoryItem["metric"],
  value: number
): string =>
  metric === "sales_count" ? `${Math.round(value)}` : formatCurrency(value);

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
          <CardTitle className="text-base">Metas</CardTitle>
          <CardDescription>
            Ate {MAX_ACTIVE_GOALS} metas ativas. O dashboard mostra apenas o
            resumo; crie, edite e arquive metas aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={atCapacity}
              onClick={() => setCreateOpen(true)}
              size="sm"
              type="button"
            >
              Nova meta
            </Button>
          </div>

          {payload.active.length === 0 ? (
            <p className="rounded-xl border border-border/60 border-dashed bg-muted/5 px-4 py-8 text-center text-muted-foreground text-sm">
              Nenhuma meta ativa. Crie uma para acompanhar no dashboard.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {payload.active.map((goal) => (
                <li
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={goal.id}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{goal.name}</span>
                      <Badge variant="secondary">
                        {metricLabel(goal.metric)}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {format(
                        parseISO(`${goal.period.from}T12:00:00`),
                        "dd/MM/yyyy",
                        {
                          locale: ptBR,
                        }
                      )}{" "}
                      —{" "}
                      {format(
                        parseISO(`${goal.period.to}T12:00:00`),
                        "dd/MM/yyyy",
                        {
                          locale: ptBR,
                        }
                      )}{" "}
                      · Alvo:{" "}
                      {formatHistoryAmount(goal.metric, goal.targetValue)} ·{" "}
                      {goal.progressPercent.toFixed(1)}% concluido
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
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
                      variant="ghost"
                    >
                      Arquivar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-border/50 border-t pt-4">
            <h3 className="font-medium text-muted-foreground text-sm">
              Historico
            </h3>
            {payload.history.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Ainda nao ha metas concluidas, expiradas ou arquivadas.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {payload.history.map((item) => (
                  <li
                    className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                    key={item.id}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{item.name}</span>
                        <Badge variant="outline">
                          {historyStatusLabel(item.status)}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Criada em{" "}
                        {format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                        {item.resolvedAt
                          ? ` · Encerrada em ${format(parseISO(item.resolvedAt), "dd/MM/yyyy", { locale: ptBR })}`
                          : null}
                      </span>
                      {item.resolutionElapsedLabel ? (
                        <span className="text-[11px] text-muted-foreground leading-snug">
                          {item.resolutionElapsedLabel}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        Resultado:{" "}
                        {item.resolvedValue === null
                          ? "—"
                          : formatHistoryAmount(
                              item.metric,
                              item.resolvedValue
                            )}{" "}
                        · Meta:{" "}
                        {formatHistoryAmount(item.metric, item.targetValue)}
                      </span>
                    </div>
                    {item.status === "archived" ? (
                      <Button
                        disabled={pending || atCapacity}
                        onClick={() => handleUnarchive(item.id)}
                        size="xs"
                        type="button"
                        variant="secondary"
                      >
                        Desarquivar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
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
              A meta sai das ativas. Voce pode desarquivar depois, se houver
              vaga entre as metas ativas.
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
