"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelSaleAction, type SaleDetail } from "@/app/(app)/vendas/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SaleDetailActions({
  sale,
}: {
  sale: Pick<SaleDetail, "id" | "status">;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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
            : "Nao foi possivel cancelar a venda."
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

      <Dialog
        onOpenChange={(open) => setConfirmingCancel(open)}
        open={confirmingCancel}
      >
        <DialogContent className="sm:max-w-115">
          <DialogHeader>
            <DialogTitle>Cancelar venda</DialogTitle>
            <DialogDescription>
              O cancelamento estorna automaticamente as quantidades para o
              estoque.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmingCancel(false)}
              type="button"
              variant="ghost"
            >
              Voltar
            </Button>
            <Button
              disabled={pending}
              onClick={handleCancelSale}
              type="button"
              variant="destructive"
            >
              {pending ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
