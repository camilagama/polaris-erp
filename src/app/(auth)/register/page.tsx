import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";
import { getSession } from "@/lib/session";

const getSafeCallbackUrl = (callbackUrl: string) =>
  callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
    ? callbackUrl
    : "/onboarding";

export const metadata: Metadata = {
  title: "Criar conta | Polaris",
  description: "Cadastro self-serve para criar uma organizacao no Polaris.",
};

export default async function RegisterPage(props: PageProps<"/register">) {
  const session = await getSession();
  const searchParams = await props.searchParams;
  const callbackUrl =
    typeof searchParams.callbackUrl === "string"
      ? searchParams.callbackUrl
      : "/onboarding";
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session) {
    redirect(safeCallbackUrl);
  }

  return (
    <main className="min-h-screen w-full">
      <SignInForm callbackUrl={safeCallbackUrl} mode="register" />
    </main>
  );
}
