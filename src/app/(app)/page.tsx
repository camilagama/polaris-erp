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
        O painel operacional será construído aqui. Por enquanto, acesse os
        módulos pelo menu lateral.
      </p>
    </div>
  );
}
