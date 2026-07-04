"use client";

import {
  Copy01Icon,
  Delete02Icon,
  Mail01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, useTransition } from "react";
import {
  cancelOrganizationInvitationAction,
  inviteOrganizationMemberAction,
  removeOrganizationMemberAction,
  updateOrganizationMemberRoleAction,
} from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  OrganizationInvitationListItem,
  OrganizationMemberListItem,
} from "@/features/organization/server";

const roleLabels = {
  admin: "Admin",
  operator: "Operador",
  owner: "Owner",
} as const;

export function MembersSettingsPanel({
  invitations,
  members,
}: {
  invitations: OrganizationInvitationListItem[];
  members: OrganizationMemberListItem[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [pending, startTransition] = useTransition();

  const handleInvite = () => {
    startTransition(async () => {
      try {
        const result = await inviteOrganizationMemberAction({ email, role });
        setEmail("");
        setRole("operator");
        toast.success(
          result.emailSent
            ? "Convite enviado."
            : "Convite criado. Copie o link na lista abaixo."
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel criar o convite."
        );
      }
    });
  };

  const handleCopyInvite = async (inviteUrl: string) => {
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado.");
  };

  const handleCancelInvitation = (invitationId: string) => {
    startTransition(async () => {
      try {
        await cancelOrganizationInvitationAction({ invitationId });
        toast.success("Convite cancelado.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel cancelar o convite."
        );
      }
    });
  };

  const handleRoleChange = (
    memberId: string,
    nextRole: "admin" | "operator"
  ) => {
    startTransition(async () => {
      try {
        await updateOrganizationMemberRoleAction({ memberId, role: nextRole });
        toast.success("Papel atualizado.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o papel."
        );
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    startTransition(async () => {
      try {
        await removeOrganizationMemberAction({ memberId });
        toast.success("Membro removido.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover o membro."
        );
      }
    });
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={UserGroupIcon} />
              Equipe
            </CardTitle>
            <CardDescription>
              Convide pessoas e controle quem opera, administra ou e owner da
              organizacao.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-1">
            <Label htmlFor="member-invite-email">Email do convite</Label>
            <Input
              autoComplete="email"
              id="member-invite-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pessoa@empresa.com"
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="member-invite-role">Papel</Label>
            <Select
              onValueChange={(value) => setRole(value as "admin" | "operator")}
              value={role}
            >
              <SelectTrigger className="w-full" id="member-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-10"
            disabled={pending || email.trim().length === 0}
            onClick={handleInvite}
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={Mail01Icon} />
            Convidar
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role === "owner" ? (
                      roleLabels.owner
                    ) : (
                      <Select
                        disabled={pending}
                        onValueChange={(value) =>
                          handleRoleChange(
                            member.id,
                            value as "admin" | "operator"
                          )
                        }
                        value={member.role}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      disabled={pending || member.role === "owner"}
                      onClick={() => handleRemoveMember(member.id)}
                      size="icon-sm"
                      title={
                        member.role === "owner"
                          ? "Owner nao pode ser removido por aqui."
                          : "Remover membro"
                      }
                      type="button"
                      variant="ghost"
                    >
                      <HugeiconsIcon icon={Delete02Icon} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {invitations.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Convites pendentes</h3>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>{roleLabels[invite.role]}</TableCell>
                      <TableCell>{invite.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            disabled={pending}
                            onClick={() => handleCopyInvite(invite.inviteUrl)}
                            size="icon-sm"
                            title="Copiar link"
                            type="button"
                            variant="ghost"
                          >
                            <HugeiconsIcon icon={Copy01Icon} />
                          </Button>
                          <Button
                            disabled={pending}
                            onClick={() => handleCancelInvitation(invite.id)}
                            size="icon-sm"
                            title="Cancelar convite"
                            type="button"
                            variant="ghost"
                          >
                            <HugeiconsIcon icon={Delete02Icon} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
