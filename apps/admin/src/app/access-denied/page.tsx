import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AdminAccessDeniedPage() {
  if (!(await getSession())) {
    redirect("/sign-in");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <p className="font-medium text-amber-300 text-sm">
          Acesso indisponivel
        </p>
        <h1 className="mt-2 font-semibold text-2xl tracking-normal">
          Esta conta nao possui acesso ao admin
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Solicite um grant temporario a um platform owner autorizado.
        </p>
      </section>
    </main>
  );
}
