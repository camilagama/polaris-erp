"use server";

import { PAID_MONTHLY_PLAN_ID } from "@polaris/billing";
import { createAsaasBillingAdapter } from "@polaris/billing/providers/asaas";
import { formatBusinessDate } from "@polaris/date";
import { billingPlans, signupCheckoutIntents } from "@polaris/db/schema";
import { withInternalJobContext } from "@polaris/db/tenant-context";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

const checkoutEmailSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

const getAppUrl = (intentId: string, state: string): string => {
  const callback = new URL(
    "/onboarding/checkout",
    serverEnv.NEXT_PUBLIC_APP_URL
  );
  callback.searchParams.set("intent", intentId);
  callback.searchParams.set("checkout", state);

  return callback.toString();
};

export const startPreSignupPaidCheckout = async (
  input: unknown
): Promise<{ checkoutUrl: string }> => {
  const { email } = checkoutEmailSchema.parse(input);

  if (!(serverEnv.ASAAS_API_BASE_URL && serverEnv.ASAAS_API_KEY)) {
    throw new Error("Checkout pago não está configurado.");
  }

  const intentId = crypto.randomUUID();
  const externalReference = `signup-checkout-intent:${intentId}`;
  const intent = await withInternalJobContext(
    "billing_checkout",
    async (tx) => {
      const [plan] = await tx
        .select({
          amountCents: billingPlans.amountCents,
          name: billingPlans.name,
        })
        .from(billingPlans)
        .where(
          and(
            eq(billingPlans.id, PAID_MONTHLY_PLAN_ID),
            eq(billingPlans.status, "active")
          )
        )
        .limit(1);

      if (!plan) {
        throw new Error("Plano pago não está disponível.");
      }

      await tx.insert(signupCheckoutIntents).values({
        billingEmail: email,
        externalReference,
        id: intentId,
        planId: PAID_MONTHLY_PLAN_ID,
        provider: "asaas",
        status: "pending",
      });

      return plan;
    }
  );

  const asaas = createAsaasBillingAdapter({
    apiKey: serverEnv.ASAAS_API_KEY,
    baseUrl: serverEnv.ASAAS_API_BASE_URL,
    fetch,
  });

  try {
    const checkout = await asaas.createHostedRecurringCheckout({
      callback: {
        cancelUrl: getAppUrl(intentId, "cancel"),
        expiredUrl: getAppUrl(intentId, "expired"),
        successUrl: getAppUrl(intentId, "success"),
      },
      cycle: "MONTHLY",
      description: `${intent.name} - assinatura mensal`,
      externalReference,
      itemName: intent.name,
      minutesToExpire: 60,
      nextDueDate: formatBusinessDate(),
      value: intent.amountCents / 100,
    });

    await withInternalJobContext("billing_checkout", (tx) =>
      tx
        .update(signupCheckoutIntents)
        .set({
          checkoutUrl: checkout.checkoutUrl,
          providerCheckoutId: checkout.checkoutId,
          status: "ready",
        })
        .where(eq(signupCheckoutIntents.id, intentId))
    );

    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    await withInternalJobContext("billing_checkout", (tx) =>
      tx
        .update(signupCheckoutIntents)
        .set({
          lastError: "provider_request_failed",
          status: "review",
        })
        .where(eq(signupCheckoutIntents.id, intentId))
    );
    throw error;
  }
};
