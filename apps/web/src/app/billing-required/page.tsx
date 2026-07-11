import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { getAppContext } from "@/lib/app-session";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Assinatura necessaria | Polaris",
  description: "Ative uma assinatura para acessar o Polaris.",
};

export default async function BillingRequiredPage() {
  await connection();

  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const context = await getAppContext();

  if (!context) {
    redirect("/onboarding");
  }

  if (context.hasBillableAccess) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
          <DGImportsLogo className="size-6 shrink-0" />
          Polaris.
        </div>
        <h1 className="font-heading text-3xl tracking-tight">
          Assinatura necessaria
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Sua conta ja foi criada, mas o acesso operacional fica bloqueado ate a
          assinatura ser ativada.
        </p>
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
          Status atual: {context.billingStatus ?? "sem assinatura"}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
            href="mailto:suporte@polaris.local?subject=Ativar%20assinatura%20Polaris"
          >
            Solicitar ativacao
          </Link>
          <p className="text-muted-foreground text-xs">
            A assinatura e obrigatoria desde o primeiro acesso. A ativacao
            manual e concluida pelo time da plataforma apos confirmacao de
            pagamento.
          </p>
        </div>
      </section>
    </main>
  );
}
