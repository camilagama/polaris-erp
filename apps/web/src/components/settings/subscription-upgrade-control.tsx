"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  getHostedCardCheckoutAction,
  requestHostedCardCheckoutAction,
} from "@/features/account/actions";

const CHECKOUT_STATUS_POLL_INTERVAL_MS = 1500;
const CHECKOUT_STATUS_POLL_LIMIT = 20;

const redirectToHostedCheckout = (checkoutUrl: string): void => {
  window.location.assign(checkoutUrl);
};

export function SubscriptionUpgradeControl({
  label = "Fazer upgrade",
}: {
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(false);

  const waitForHostedCheckout = async (
    checkoutSessionId: string,
    attempt = 0
  ): Promise<void> => {
    try {
      const checkout = await getHostedCardCheckoutAction({
        checkoutSessionId,
      });

      if (checkout.status === "ready" && checkout.checkoutUrl) {
        redirectToHostedCheckout(checkout.checkoutUrl);
        return;
      }

      if (checkout.status === "review") {
        setWaiting(false);
        toast.error("Checkout em revisao. Tente novamente mais tarde.");
        return;
      }

      if (attempt >= CHECKOUT_STATUS_POLL_LIMIT) {
        setWaiting(false);
        toast.error(
          "O checkout ainda esta sendo preparado. Atualize a pagina."
        );
        return;
      }

      window.setTimeout(() => {
        waitForHostedCheckout(checkoutSessionId, attempt + 1).catch(
          () => undefined
        );
      }, CHECKOUT_STATUS_POLL_INTERVAL_MS);
    } catch (error) {
      setWaiting(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel preparar o checkout hospedado."
      );
    }
  };

  const requestUpgrade = () => {
    startTransition(async () => {
      try {
        const checkout = await requestHostedCardCheckoutAction({
          idempotencyKey: crypto.randomUUID(),
        });

        if (checkout.status === "ready" && checkout.checkoutUrl) {
          redirectToHostedCheckout(checkout.checkoutUrl);
          return;
        }

        if (checkout.status === "review") {
          toast.error("Checkout em revisao. Tente novamente mais tarde.");
          return;
        }

        setWaiting(true);
        waitForHostedCheckout(checkout.checkoutSessionId).catch(
          () => undefined
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel iniciar o checkout hospedado."
        );
      }
    });
  };

  return (
    <Button
      disabled={pending || waiting}
      onClick={requestUpgrade}
      size="xs"
      type="button"
    >
      {pending || waiting ? "Preparando checkout..." : label}
    </Button>
  );
}
