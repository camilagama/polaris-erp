import { listPlatformAdminGrantsForOwner } from "@polaris/platform/admin";
import { TimeValue } from "@polaris/ui/components/shared/time-value";
import { connection } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";
import {
  createPlatformAdminEnrollmentAction,
  revokePlatformAdminGrantAction,
} from "./actions";

export default async function PlatformAdminAccessPage() {
  await connection();

  await requirePlatformAdmin({ minimumRole: "owner" });

  const grants = await listPlatformAdminGrantsForOwner();

  return (
    <main className="grid gap-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <h1 className="font-semibold text-2xl tracking-normal">
          Acessos temporários da plataforma
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Somente owner ativo concede ou revoga grants. Todo grant exige motivo,
          expiração e auditoria.
        </p>
        <form
          action={createPlatformAdminEnrollmentAction}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <label className="grid gap-2 text-sm">
            E-mail do usuário
            <input
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Papel temporário
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue="support"
              name="role"
            >
              <option value="support">Support</option>
              <option value="operator">Operator</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            Expira em (horário de São Paulo)
            <input
              aria-describedby="expiration-help"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              name="expiresAt"
              required
              step={60}
              type="datetime-local"
            />
          </label>
          <p
            className="text-muted-foreground text-sm md:col-span-2"
            id="expiration-help"
          >
            Limites: Support 14 dias, Operator 30 dias e Owner 90 dias. Cada dia
            equivale a 24 horas. O convite vale por até 7 dias, sem ultrapassar
            a expiração do acesso.
          </p>
          <label className="grid gap-2 text-sm md:col-span-2">
            Motivo, sem PII desnecessária
            <textarea
              className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
              maxLength={240}
              name="reason"
              required
            />
          </label>
          <button
            className="w-fit rounded-md border border-border px-4 py-2 font-medium text-sm hover:border-muted-foreground"
            type="submit"
          >
            Conceder acesso temporário
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="grid min-w-[900px] grid-cols-[1.1fr_0.8fr_1fr_1.3fr_1fr] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase">
          <span>Usuário</span>
          <span>Papel</span>
          <span>Expira</span>
          <span>Motivo</span>
          <span>Status</span>
        </div>
        {grants.map((grant) => (
          <article
            className="grid min-w-[900px] grid-cols-[1.1fr_0.8fr_1fr_1.3fr_1fr] gap-4 border-border border-b px-4 py-3 text-sm"
            key={grant.grantId}
          >
            <span className="truncate font-mono">{grant.adminUserId}</span>
            <span>{grant.role}</span>
            <span>
              <TimeValue kind="instant" value={grant.expiresAt} />
            </span>
            <span className="truncate">{grant.reason}</span>
            {grant.revokedAt ? (
              <span>Revogado</span>
            ) : (
              <form
                action={revokePlatformAdminGrantAction}
                className="grid gap-2"
              >
                <input name="grantId" type="hidden" value={grant.grantId} />
                <input
                  aria-label={`Motivo para revogar ${grant.grantId}`}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  maxLength={240}
                  name="reason"
                  placeholder="Motivo"
                  required
                />
                <button className="w-fit underline" type="submit">
                  Revogar
                </button>
              </form>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
