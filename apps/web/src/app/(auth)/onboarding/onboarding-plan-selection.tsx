import {
  FREE_PLAN_ENTITLEMENTS,
  PAID_MONTHLY_PLAN_ENTITLEMENTS,
} from "@polaris/billing";
import Link from "next/link";
import { SubscriptionUpgradeControl } from "@/components/settings/subscription-upgrade-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PlanLimits = ({
  maxActiveGoals,
  maxImagesPerProduct,
  maxRegisteredProducts,
}: {
  maxActiveGoals: number;
  maxImagesPerProduct: number;
  maxRegisteredProducts: number;
}) => (
  <ul className="flex flex-col gap-2 text-muted-foreground text-sm">
    <li>{maxRegisteredProducts} produtos cadastrados</li>
    <li>{maxActiveGoals} meta ativa</li>
    <li>{maxImagesPerProduct} imagem(ns) por produto</li>
  </ul>
);

export function OnboardingPlanSelection() {
  return (
    <section
      aria-labelledby="plan-selection-title"
      className="w-full max-w-2xl"
    >
      <div className="mb-8 text-center">
        <h1
          className="font-heading text-3xl tracking-tight"
          id="plan-selection-title"
        >
          Escolha como começar
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Seu espaço já está pronto no Free. Faça upgrade quando quiser.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>R$ 0 para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanLimits {...FREE_PLAN_ENTITLEMENTS} />
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href="/">Continuar no Free</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Polaris Pago</CardTitle>
            <CardDescription>R$ 49,90 por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanLimits {...PAID_MONTHLY_PLAN_ENTITLEMENTS} />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <SubscriptionUpgradeControl label="Assinar com cartão" />
            <p className="text-center text-muted-foreground text-xs">
              O pagamento é concluído em checkout seguro externo.
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
