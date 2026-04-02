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
    <main className="min-h-screen w-full">
      <SignInForm />
    </main>
  );
}
