import type { Metadata } from "next";
import Link from "next/link";
import { PricingCheckoutForm } from "./pricing-checkout-form";

export const metadata: Metadata = {
  title: "Planos | Polaris",
  description: "Escolha o plano Polaris mais adequado para seu negócio.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <p className="font-medium text-muted-foreground text-sm">
          Polaris Pago
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight">
          R$ 49,90/mês
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          250 produtos cadastrados, 3 metas ativas e até 5 imagens por produto.
        </p>
        <div className="mt-6">
          <PricingCheckoutForm />
        </div>
        <p className="mt-5 text-center text-muted-foreground text-xs">
          Prefere começar sem cobrança?{" "}
          <Link className="underline" href="/sign-in">
            Crie sua conta no Free
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
