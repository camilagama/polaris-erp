"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogSettingsSchema } from "@/features/catalog/schema";
import {
  createInitialOrganizationForUser,
  getAppContext,
} from "@/lib/app-session";
import { requireSession } from "@/lib/session";

const onboardingSchema = z.object({
  cardFeePercent: z.coerce
    .number()
    .min(0, "A taxa do cartao deve ser maior ou igual a zero."),
  idealMarkupPercent: z.coerce
    .number()
    .min(0, "A margem ideal deve ser maior ou igual a zero."),
  maxCardInstallments: z.coerce.number().int().min(1).max(12),
  minimumMarkupPercent: z.coerce
    .number()
    .min(0, "A margem minima deve ser maior ou igual a zero."),
  organizationName: z.string().trim().min(2, "Informe o nome da organizacao."),
});

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  const existingContext = await getAppContext();

  if (existingContext) {
    redirect("/");
  }

  const parsed = onboardingSchema.safeParse({
    cardFeePercent: formData.get("cardFeePercent"),
    idealMarkupPercent: formData.get("idealMarkupPercent"),
    maxCardInstallments: formData.get("maxCardInstallments"),
    minimumMarkupPercent: formData.get("minimumMarkupPercent"),
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    throw new Error("Informe um nome valido para a organizacao.");
  }

  const settings = catalogSettingsSchema.parse({
    cardInstallmentRules: Array.from(
      { length: parsed.data.maxCardInstallments },
      (_value, index) => ({
        feePercent: index === 0 ? 0 : parsed.data.cardFeePercent,
        installments: index + 1,
      })
    ),
    idealMarkupPercent: parsed.data.idealMarkupPercent,
    minimumMarkupPercent: parsed.data.minimumMarkupPercent,
  });

  await createInitialOrganizationForUser({
    cardInstallmentRules: settings.cardInstallmentRules,
    idealMarkupPercent: settings.idealMarkupPercent,
    minimumMarkupPercent: settings.minimumMarkupPercent,
    name: parsed.data.organizationName,
    userId: session.user.id,
  });

  redirect("/");
}
