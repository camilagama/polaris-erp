"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveGoalAction } from "@/app/(app)/metas/actions";
import { GoalFormDialog } from "@/components/dashboard/goal-form-dialog";
import { GoalProgressBarChart } from "@/components/dashboard/goal-progress-bar-chart";
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
  type GoalsDashboardPayload,
  MAX_ACTIVE_GOALS,
} from "@/features/goals/contracts";
import { formatDateInputValue } from "@/lib/domain/date";
import { formatCurrency } from "@/lib/formatters";

const metricBadgeLabel = (goal: DashboardGoalCard): string => {
  switch (goal.metric) {
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

const formatPeriodLine = (goal: DashboardGoalCard): string => {
  const from = format(parseISO(`${goal.period.from}T12:00:00`), "dd/MM/yyyy", {
    locale: ptBR,
  });
  const to = format(parseISO(`${goal.period.to}T12:00:00`), "dd/MM/yyyy", {
    locale: ptBR,
  });

  return `${from} — ${to}`;
};

const daysRemainingLabel = (periodEnd: string): string => {
  const today = formatDateInputValue();
  if (today > periodEnd) {
    return "Prazo encerrado";
  }

  const days = differenceInCalendarDays(
    parseISO(`${periodEnd}T12:00:00`),
    parseISO(`${today}T12:00:00`)
  );

  if (days === 0) {
    return "Ultimo dia";
  }

  return `${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`;
};

const historyStatusLabel = (
  status: GoalsDashboardPayload["history"][number]["status"]
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

export function DashboardGoalsSection({
  payload,
}: {
  payload: GoalsDashboardPayload;
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

  return (
    <>
      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Metas</CardTitle>
              <CardDescription>
                Ate {MAX_ACTIVE_GOALS} metas ativas. Progresso pelo periodo da
                meta (vendas concluidas), independente do filtro acima.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
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
        <CardContent className="flex flex-col gap-6 pt-0">
          {payload.active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 border-dashed bg-muted/10 px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                Nenhuma meta ativa. Crie uma para acompanhar receita, lucro ou
                volume de vendas.
              </p>
              <Button
                disabled={atCapacity}
                onClick={() => setCreateOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                Criar primeira meta
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {payload.active.map((goal) => (
                <div
                  className="rounded-xl border border-border/60 bg-muted/5 p-4"
                  key={goal.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{goal.name}</span>
                        <Badge variant="secondary">
                          {metricBadgeLabel(goal)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {daysRemainingLabel(goal.period.to)}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Periodo da meta: {formatPeriodLine(goal)}
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
                  </div>
                  <GoalProgressBarChart
                    actualValue={goal.actualValue}
                    barPercent={goal.barPercent}
                    displayMode={goal.displayMode}
                    metric={goal.metric}
                    progressPercent={goal.progressPercent}
                    targetValue={goal.targetValue}
                  />
                </div>
              ))}
            </div>
          )}

          {payload.history.length > 0 ? (
            <div className="flex flex-col gap-2 border-border/50 border-t pt-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Historico recente
              </p>
              <ul className="flex flex-col gap-2">
                {payload.history.map((item) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/5 px-3 py-2 text-sm"
                    key={item.id}
                  >
                    <span className="min-w-0 truncate font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {historyStatusLabel(item.status)}
                      {item.resolvedValue !== null &&
                      item.metric !== "sales_count"
                        ? ` · ${formatCurrency(item.resolvedValue)}`
                        : null}
                      {item.resolvedValue !== null &&
                      item.metric === "sales_count"
                        ? ` · ${Math.round(item.resolvedValue)} vendas`
                        : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <GoalFormDialog
        mode="create"
        onOpenChange={setCreateOpen}
        open={createOpen}
      />

      {editGoal ? (
        <GoalFormDialog
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
              A meta sai das ativas e vai para o historico. Voce pode criar
              outra meta se estiver no limite.
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
