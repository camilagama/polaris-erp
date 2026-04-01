import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Entrar | DG Imports",
  description: "Acesso autenticado a operacao interna do DG Imports.",
};

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
      <SignInForm />
    </main>
  );
}
