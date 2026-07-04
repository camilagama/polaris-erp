import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            Sua conta sera owner deste workspace. Ajuste o basico agora e refine
            depois em Configuracoes.
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="minimumMarkupPercent">Margem minima</Label>
              <InputGroup>
                <InputGroupInput
                  defaultValue="20"
                  id="minimumMarkupPercent"
                  min="0"
                  name="minimumMarkupPercent"
                  step="0.01"
                  type="number"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="idealMarkupPercent">Margem ideal</Label>
              <InputGroup>
                <InputGroupInput
                  defaultValue="40"
                  id="idealMarkupPercent"
                  min="0"
                  name="idealMarkupPercent"
                  step="0.01"
                  type="number"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxCardInstallments">Parcelas no cartao</Label>
              <Select defaultValue="3" name="maxCardInstallments">
                <SelectTrigger className="w-full" id="maxCardInstallments">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_value, index) => index + 1).map(
                    (installments) => (
                      <SelectItem
                        key={installments}
                        value={String(installments)}
                      >
                        {installments}x
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cardFeePercent">Taxa padrao 2x+</Label>
              <InputGroup>
                <InputGroupInput
                  defaultValue="0"
                  id="cardFeePercent"
                  min="0"
                  name="cardFeePercent"
                  step="0.01"
                  type="number"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <Button className="h-11 w-full" type="submit">
            Comecar
          </Button>
        </form>
      </div>
    </main>
  );
}
