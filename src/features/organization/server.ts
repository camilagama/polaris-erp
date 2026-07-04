import "server-only";

import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invitation, member, sessions, users } from "@/db/schema";
import { ORGANIZATION_ROLES, type OrganizationRole } from "@/lib/app-context";
import type { AppContext } from "@/lib/app-session";
import { recordAuditEvent } from "@/lib/audit-log";
import { serverEnv } from "@/lib/env";

const INVITATION_EXPIRATION_DAYS = 7;
const INVITATION_EXPIRATION_MS =
  INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
const TRAILING_SLASHES_PATTERN = /\/+$/;

const inviteRoleSchema = z.enum(["admin", "operator"]);

const inviteMemberSchema = z.object({
  email: z.string().trim().email("Informe um email valido."),
  role: inviteRoleSchema,
});

const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: inviteRoleSchema,
});

const organizationInvitationIdSchema = z.object({
  invitationId: z.string().min(1),
});

const organizationMemberIdSchema = z.object({
  memberId: z.string().min(1),
});

export interface OrganizationMemberListItem {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: OrganizationRole;
  userId: string;
}

export interface OrganizationInvitationListItem {
  email: string;
  expiresAt: Date | null;
  id: string;
  inviteUrl: string;
  role: Exclude<OrganizationRole, "owner">;
  status: string;
}

const normalizeRole = (role: string): OrganizationRole =>
  ORGANIZATION_ROLES.includes(role as OrganizationRole)
    ? (role as OrganizationRole)
    : "operator";

const buildInviteUrl = (invitationId: string) =>
  `${serverEnv.NEXT_PUBLIC_APP_URL.replace(TRAILING_SLASHES_PATTERN, "")}/convites/${invitationId}`;

const sendInvitationEmail = async ({
  email,
  inviteUrl,
}: {
  email: string;
  inviteUrl: string;
}) => {
  if (!serverEnv.MAGIC_LINK_EMAIL_WEBHOOK_URL) {
    return false;
  }

  const response = await fetch(serverEnv.MAGIC_LINK_EMAIL_WEBHOOK_URL, {
    body: JSON.stringify({
      email,
      url: inviteUrl,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return response.ok;
};

export const listOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMemberListItem[]> => {
  const rows = await db
    .select({
      createdAt: member.createdAt,
      email: users.email,
      id: member.id,
      name: users.name,
      role: member.role,
      userId: member.userId,
    })
    .from(member)
    .innerJoin(users, eq(member.userId, users.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(member.createdAt));

  return rows.map((row) => ({
    ...row,
    role: normalizeRole(row.role),
  }));
};

export const listOrganizationInvitations = async (
  organizationId: string
): Promise<OrganizationInvitationListItem[]> => {
  const rows = await db
    .select({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      id: invitation.id,
      role: invitation.role,
      status: invitation.status,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        ne(invitation.status, "accepted")
      )
    )
    .orderBy(asc(invitation.createdAt));

  return rows.map((row) => ({
    ...row,
    inviteUrl: buildInviteUrl(row.id),
    role: row.role === "admin" ? "admin" : "operator",
  }));
};

export const inviteOrganizationMember = async (
  context: AppContext,
  input: unknown
) => {
  const parsed = inviteMemberSchema.parse(input);
  const normalizedEmail = parsed.email.toLowerCase();
  const invitationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRATION_MS);
  const inviteUrl = buildInviteUrl(invitationId);

  await db.insert(invitation).values({
    email: normalizedEmail,
    expiresAt,
    id: invitationId,
    inviterId: context.userId,
    organizationId: context.organizationId,
    role: parsed.role,
    status: "pending",
  });

  const emailSent = await sendInvitationEmail({
    email: normalizedEmail,
    inviteUrl,
  });

  await recordAuditEvent({
    context,
    metadata: {
      email: normalizedEmail,
      emailSent,
      role: parsed.role,
    },
    subjectId: invitationId,
    subjectType: "invitation",
    type: "invitation.created",
  });

  return { emailSent, inviteUrl };
};

export const cancelOrganizationInvitation = async (
  context: AppContext,
  input: unknown
) => {
  const parsed = organizationInvitationIdSchema.parse(input);

  await db
    .update(invitation)
    .set({
      status: "cancelled",
    })
    .where(
      and(
        eq(invitation.id, parsed.invitationId),
        eq(invitation.organizationId, context.organizationId)
      )
    );

  await recordAuditEvent({
    context,
    subjectId: parsed.invitationId,
    subjectType: "invitation",
    type: "invitation.cancelled",
  });
};

export const updateOrganizationMemberRole = async (
  context: AppContext,
  input: unknown
) => {
  const parsed = updateMemberRoleSchema.parse(input);

  await db
    .update(member)
    .set({
      role: parsed.role,
    })
    .where(
      and(
        eq(member.id, parsed.memberId),
        eq(member.organizationId, context.organizationId),
        ne(member.userId, context.userId),
        ne(member.role, "owner")
      )
    );

  await recordAuditEvent({
    context,
    metadata: { role: parsed.role },
    subjectId: parsed.memberId,
    subjectType: "member",
    type: "member.role_updated",
  });
};

export const removeOrganizationMember = async (
  context: AppContext,
  input: unknown
) => {
  const parsed = organizationMemberIdSchema.parse(input);

  await db
    .delete(member)
    .where(
      and(
        eq(member.id, parsed.memberId),
        eq(member.organizationId, context.organizationId),
        ne(member.userId, context.userId),
        ne(member.role, "owner")
      )
    );

  await recordAuditEvent({
    context,
    subjectId: parsed.memberId,
    subjectType: "member",
    type: "member.removed",
  });
};

export const acceptOrganizationInvitation = async ({
  invitationId,
  sessionId,
  userEmail,
  userId,
}: {
  invitationId: string;
  sessionId: string;
  userEmail: string;
  userId: string;
}) => {
  const [existingInvitation] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!existingInvitation) {
    throw new Error("Convite nao encontrado.");
  }

  if (existingInvitation.status !== "pending") {
    throw new Error("Convite indisponivel.");
  }

  if (
    existingInvitation.expiresAt &&
    existingInvitation.expiresAt.getTime() < Date.now()
  ) {
    throw new Error("Convite expirado.");
  }

  if (existingInvitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("Este convite pertence a outro email.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(member)
      .values({
        id: crypto.randomUUID(),
        organizationId: existingInvitation.organizationId,
        role: existingInvitation.role === "admin" ? "admin" : "operator",
        userId,
      })
      .onConflictDoNothing();

    await tx
      .update(invitation)
      .set({
        status: "accepted",
      })
      .where(eq(invitation.id, invitationId));

    await tx
      .update(sessions)
      .set({
        activeOrganizationId: existingInvitation.organizationId,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  });
};
