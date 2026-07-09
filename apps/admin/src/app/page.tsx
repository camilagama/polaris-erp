import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

const adminSections = [
  {
    label: "Organizacoes",
    status: "Read-only pendente",
  },
  {
    label: "Usuarios",
    status: "Read-only pendente",
  },
  {
    label: "Auditoria",
    status: "Base criada",
  },
  {
    label: "Suporte",
    status: "Notas internas criadas",
  },
] as const;

const getAdminContext = async () => {
  try {
    return await requirePlatformAdmin();
  } catch {
    forbidden();
  }
};

const AdminDashboard = async () => {
  await connection();

  const context = await getAdminContext();

  return (
    <>
      <section className="border-zinc-800 border-b bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-medium text-emerald-300 text-sm">
              Polaris Platform
            </p>
            <h1 className="mt-1 font-semibold text-2xl tracking-normal">
              Admin interno
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Acesso verificado</p>
            <p className="font-medium text-sm text-zinc-100">{context.role}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg tracking-normal">
                Console operacional
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Superficie interna bloqueada por Cloudflare Access, sessao
                Better Auth e grant ativo de platform admin.
              </p>
            </div>
            <div className="rounded-md border border-zinc-700 px-3 py-2 text-sm">
              <span className="text-zinc-400">Admin ID </span>
              <span className="font-mono text-zinc-100">
                {context.platformAdminId.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {adminSections.map((section) => (
            <article
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              key={section.label}
            >
              <h2 className="font-medium text-base tracking-normal">
                {section.label}
              </h2>
              <p className="mt-3 text-sm text-zinc-400">{section.status}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
};

const AdminDashboardFallback = () => (
  <section className="border-zinc-800 border-b bg-zinc-950">
    <div className="mx-auto w-full max-w-6xl px-6 py-5">
      <p className="font-medium text-emerald-300 text-sm">Polaris Platform</p>
      <h1 className="mt-1 font-semibold text-2xl tracking-normal">
        Admin interno
      </h1>
    </div>
  </section>
);

export default function AdminRootPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<AdminDashboardFallback />}>
        <AdminDashboard />
      </Suspense>
    </main>
  );
}
