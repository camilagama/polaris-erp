"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@polaris/ui/components/ui/alert-dialog";
import { Button } from "@polaris/ui/components/ui/button";
import { toast } from "@polaris/ui/components/ui/sonner";
import { useState, useTransition } from "react";
import { requestSubscriptionCancellationAction } from "@/features/account/actions";

export function SubscriptionCancellationControl() {
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const requestCancellation = () => {
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);

    startTransition(async () => {
      try {
        await requestSubscriptionCancellationAction({ idempotencyKey: key });
        setIdempotencyKey(null);
        setOpen(false);
        toast.success("Cancelamento agendado para o fim do periodo atual.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel confirmar o cancelamento."
        );
      }
    });
  };

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button size="xs" type="button" variant="outline">
          Cancelar no fim do periodo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar renovacao</AlertDialogTitle>
          <AlertDialogDescription>
            O acesso pago continua ate o fim do periodo ja pago. Depois, a conta
            passa automaticamente para o plano Free, sem apagar dados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              requestCancellation();
            }}
          >
            {pending ? "Agendando..." : "Confirmar cancelamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
