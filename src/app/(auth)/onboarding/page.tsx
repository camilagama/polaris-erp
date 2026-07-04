import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { getAppContext } from "@/lib/app-session";
import { getSession } from "@/lib/session";
import { completeOnboardingAction } from "./actions";

export const metadata: Metadata = {
  title: "Onboarding | DG Imports",
  description: "Crie sua organizacao para comecar a usar o DG Imports.",
};

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const context = await getAppContext();

  if (context) {
    redirect("/");
  }

  const defaultOrganizationName =
    session.user.name?.trim() || session.user.email.split("@")[0] || "";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            DG Imports.
          </div>
          <h1 className="font-heading text-3xl tracking-tight">
            Criar organizacao
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Sua conta sera owner deste workspace.
          </p>
        </div>

        <form action={completeOnboardingAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizationName">Nome da organizacao</Label>
            <Input
              autoComplete="organization"
              defaultValue={defaultOrganizationName}
              id="organizationName"
              minLength={2}
              name="organizationName"
              placeholder="Minha loja"
              required
            />
          </div>

          <Button className="h-11 w-full" type="submit">
            Comecar
          </Button>
        </form>
      </div>
    </main>
  );
}
