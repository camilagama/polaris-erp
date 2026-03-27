export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Dashboard</h1>
      <p className="text-muted-foreground">Bem-vindo ao DG Imports.</p>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  );
}
