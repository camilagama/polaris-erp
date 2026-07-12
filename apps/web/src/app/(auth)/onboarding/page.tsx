import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DGImportsLogo } from "@/components/ui/svgs/logo";
import { getAppContext } from "@/lib/app-session";
import { getSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Onboarding | Polaris",
  description: "Prepare sua conta para comecar a usar o Polaris.",
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

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 font-medium uppercase tracking-[0.24em]">
            <DGImportsLogo className="size-6 shrink-0" />
            Polaris.
          </div>
          <h1 className="font-heading text-3xl tracking-tight">Ativar conta</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Conclua a configuracao inicial para acessar o Polaris.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </main>
  );
}
