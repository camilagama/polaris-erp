export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <p className="font-medium text-amber-300 text-sm">Acesso negado</p>
        <h1 className="mt-2 font-semibold text-2xl tracking-normal">
          Admin interno protegido
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Sua sessao esta valida, mas nao possui um grant administrativo ativo.
        </p>
      </section>
    </main>
  );
}
