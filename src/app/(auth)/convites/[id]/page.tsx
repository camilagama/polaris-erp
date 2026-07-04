import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { db } from "@/db";
import { invitation, organization } from "@/db/schema";
import { getSession } from "@/lib/session";
import { acceptInvitationAction } from "./actions";

export const metadata: Metadata = {
  title: "Aceitar convite | DG Imports",
  description: "Entre em uma organizacao do DG Imports.",
};

export default async function InvitationPage(
  props: PageProps<"/convites/[id]">
) {
  const params = await props.params;
  const session = await getSession();

  if (!session) {
    redirect(`/sign-in?callbackUrl=/convites/${params.id}`);
  }

  const [row] = await db
    .select({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
      role: invitation.role,
      status: invitation.status,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, params.id))
    .limit(1);

  const isUnavailable =
    row?.status !== "pending" ||
    Boolean(row?.expiresAt && row.expiresAt.getTime() < Date.now());
  const emailMatches =
    row?.email.toLowerCase() === session.user.email.toLowerCase();
  let content = (
    <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-center text-muted-foreground text-sm">
      Convite indisponivel ou expirado.
    </div>
  );

  if (row && !isUnavailable && emailMatches) {
    content = (
      <form action={acceptInvitationAction} className="flex flex-col gap-4">
        <input name="invitationId" type="hidden" value={params.id} />
        <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium">{row.organizationName}</p>
          <p className="mt-1 text-muted-foreground">
            Papel inicial: {row.role === "admin" ? "Admin" : "Operador"}.
          </p>
        </div>
        <Button className="h-11 w-full" type="submit">
          Entrar na organizacao
        </Button>
      </form>
    );
  } else if (row && !isUnavailable) {
    content = (
      <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-center text-muted-foreground text-sm">
        Entre com o email {row.email} para aceitar este convite.
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            DG Imports.
          </div>
          <h1 className="font-heading text-3xl tracking-tight">
            Aceitar convite
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {row
              ? `Voce foi convidado para ${row.organizationName}.`
              : "Este convite nao foi encontrado."}
          </p>
        </div>

        {content}
      </div>
    </main>
  );
}
