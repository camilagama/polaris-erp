import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const getMessage = (state: string | undefined) => {
  if (state === "cancel" || state === "expired") {
    return {
      description:
        "O pagamento não foi concluído. Você pode tentar novamente ou começar no Free.",
      title: "Checkout não concluído",
    };
  }

  return {
    description:
      "Confirme seu pagamento pelo e-mail e crie a conta com o mesmo endereço. A ativação do plano acontece após a confirmação do provedor.",
    title: "Estamos confirmando seu pagamento",
  };
};

export default async function OnboardingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getSession();

  if (session) {
    redirect("/onboarding");
  }

  const { checkout } = await searchParams;
  const message = getMessage(checkout);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md text-center">
        <h1 className="font-heading text-3xl tracking-tight">
          {message.title}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          {message.description}
        </p>
        <Button asChild className="mt-6">
          <Link href="/sign-in">Criar conta ou entrar</Link>
        </Button>
      </section>
    </main>
  );
}
