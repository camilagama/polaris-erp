"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { toast } from "@/components/ui/sonner";
import { cancelSaleAction } from "@/features/sales/actions";
import type { SaleDetail } from "@/features/sales/contracts";

export function SaleDetailActions({
  sale,
}: {
  sale: Pick<SaleDetail, "id" | "status">;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const router = useRouter();

  const handleCancelSale = () => {
    startTransition(async () => {
      try {
        await cancelSaleAction(sale.id);
        toast.success("Venda cancelada com estorno de estoque.");
        setConfirmingCancel(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro de conexao ou timeout. Nao foi possivel confirmar o cancelamento da venda."
        );
      }
    });
  };

  if (sale.status === "cancelled") {
    return (
      <Button disabled size="xs" type="button" variant="ghost">
        Venda cancelada
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setConfirmingCancel(true)}
        size="xs"
        type="button"
        variant="destructive"
      >
        Cancelar venda
      </Button>

      <AlertDialog onOpenChange={setConfirmingCancel} open={confirmingCancel}>
        <AlertDialogContent className="sm:max-w-115">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venda</AlertDialogTitle>
            <AlertDialogDescription>
              O cancelamento estorna automaticamente as quantidades para o
              estoque. O historico da operacao e mantido, mas o valor faturado e
              abatido das metas e relatorios. Esta acao e irreversivel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                handleCancelSale();
              }}
              variant="destructive"
            >
              {pending ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
