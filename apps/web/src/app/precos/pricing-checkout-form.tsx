"use client";

import { Button } from "@polaris/ui/components/ui/button";
import { Input } from "@polaris/ui/components/ui/input";
import { useState, useTransition } from "react";
import { startPreSignupPaidCheckout } from "@/features/onboarding/pre-signup-checkout";

export function PricingCheckoutForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = formData.get("email");

        startTransition(async () => {
          try {
            const checkout = await startPreSignupPaidCheckout({ email });
            window.location.assign(checkout.checkoutUrl);
          } catch (checkoutError) {
            setError(
              checkoutError instanceof Error
                ? checkoutError.message
                : "Não foi possível iniciar o checkout."
            );
          }
        });
      }}
    >
      <label
        className="flex flex-col gap-2 font-medium text-sm"
        htmlFor="email"
      >
        E-mail que você usará para entrar
        <Input
          autoComplete="email"
          id="email"
          name="email"
          required
          type="email"
        />
      </label>
      <p className="text-muted-foreground text-xs">
        Use este mesmo e-mail na criação da conta para ativar o plano.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button disabled={pending} type="submit">
        {pending ? "Preparando checkout..." : "Assinar com cartão"}
      </Button>
    </form>
  );
}
