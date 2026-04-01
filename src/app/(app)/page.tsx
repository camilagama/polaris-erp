import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | DG Imports",
  description: "Painel inicial da operacao protegida do DG Imports.",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
        Em breve
      </p>
      <h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
        Dashboard
      </h1>
      <p className="max-w-sm text-muted-foreground text-sm">
        O painel operacional sera construido aqui. Por enquanto, acesse os
        modulos pelo menu lateral.
      </p>
    </div>
  );
}
