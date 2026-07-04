"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptOrganizationInvitation } from "@/features/organization/server";
import { requireSession } from "@/lib/session";

const acceptInvitationSchema = z.object({
  invitationId: z.string().min(1),
});

export async function acceptInvitationAction(formData: FormData) {
  const session = await requireSession();
  const parsed = acceptInvitationSchema.parse({
    invitationId: formData.get("invitationId"),
  });
  const sessionId = (session.session as { id?: string }).id;

  if (!sessionId) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  await acceptOrganizationInvitation({
    invitationId: parsed.invitationId,
    sessionId,
    userEmail: session.user.email,
    userId: session.user.id,
  });

  redirect("/");
}
