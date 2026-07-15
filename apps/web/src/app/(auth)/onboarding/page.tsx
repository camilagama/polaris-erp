import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { getAppAccess } from "@/lib/app-session";
import { getSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";
import { OnboardingPlanSelection } from "./onboarding-plan-selection";

export const metadata: Metadata = {
  title: "Onboarding | Polaris",
  description: "Prepare sua conta para comecar a usar o Polaris.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const access = await getAppAccess();

  if (access.kind === "suspended") {
    redirect("/restricted-access");
  }

  if (access.kind === "active") {
    const step = (await searchParams).step;

    if (step === "plan") {
      return (
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
          <OnboardingPlanSelection />
        </main>
      );
    }

    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            Polaris.
          </div>
          <h1 className="font-heading text-3xl tracking-tight">
            Crie seu espaço
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Escolha um nome para começar a usar o Polaris.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </main>
  );
}
