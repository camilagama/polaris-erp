import { DGImportsLogo } from "@polaris/ui/components/ui/svgs/logo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAppAccess } from "@/lib/app-session";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Acesso restrito | Polaris",
  description: "O acesso desta conta foi restringido pela plataforma.",
};

export default async function RestrictedAccessPage() {
  await connection();

  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const access = await getAppAccess();

  if (access.kind !== "suspended") {
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
          Acesso restrito
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Esta conta foi restringida pela plataforma. As operacoes e os dados
          permanecem bloqueados enquanto a revisao estiver em andamento.
        </p>
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
          Para esclarecer esta restricao, entre em contato com o suporte da
          plataforma pelo canal habitual.
        </p>
      </section>
    </main>
  );
}
