import { Card, CardContent, CardHeader } from "@polaris/ui/components/ui/card";
import { Skeleton } from "@polaris/ui/components/ui/skeleton";

export function AdminDashboardSkeleton() {
  return (
    <section className="grid gap-6">
      {/* AlertBanner (ocupa espaco se estiver la, na duvida a pagina real carrega alert dinamicamente mas n da layout shift se a gente ignorar, ou colocamos um retangulo pequeno) */}
      <Skeleton className="h-[48px] w-full rounded-lg" />

      {/* Console operacional */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Atividade do Sistema e Status operacional */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <Skeleton className="mb-1.5 h-6 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="flex-1">
            <Skeleton className="h-[140px] w-full" />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton className="h-[38px] w-full rounded-md" key={i} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Desempenho Geral e Eventos recentes */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <Skeleton className="mb-1.5 h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <Skeleton className="mb-4 h-[120px] w-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton className="h-[52px] w-full rounded-md" key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
