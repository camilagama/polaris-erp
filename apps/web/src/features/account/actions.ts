"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  getHostedCardCheckout,
  requestHostedCardCheckout,
  requestSubscriptionCancellation,
} from "@/features/account/server";
import { requireAppContext } from "@/lib/app-session";

const subscriptionCancellationRequestSchema = z.object({
  idempotencyKey: z.uuid(),
});

const hostedCheckoutRequestSchema = z.object({
  idempotencyKey: z.uuid(),
});

const hostedCheckoutStatusSchema = z.object({
  checkoutSessionId: z.uuid(),
});

export const requestHostedCardCheckoutAction = async (
  data: unknown
): Promise<{
  checkoutSessionId: string;
  checkoutUrl: string | null;
  status: "pending" | "ready" | "review";
}> => {
  const context = await requireAppContext("settings:write");
  const { idempotencyKey } = hostedCheckoutRequestSchema.parse(data);
  const result = await requestHostedCardCheckout({
    actorUserId: context.userId,
    idempotencyKey,
    organizationId: context.organizationId,
  });

  refresh();

  return result;
};

export const getHostedCardCheckoutAction = async (
  data: unknown
): Promise<{
  checkoutSessionId: string;
  checkoutUrl: string | null;
  status: "pending" | "ready" | "review";
}> => {
  const context = await requireAppContext("settings:write");
  const { checkoutSessionId } = hostedCheckoutStatusSchema.parse(data);

  return getHostedCardCheckout({
    checkoutSessionId,
    organizationId: context.organizationId,
  });
};

export const requestSubscriptionCancellationAction = async (
  data: unknown
): Promise<{ subscriptionId: string }> => {
  const context = await requireAppContext("settings:write");
  const { idempotencyKey } = subscriptionCancellationRequestSchema.parse(data);
  const result = await requestSubscriptionCancellation({
    actorUserId: context.userId,
    idempotencyKey,
    organizationId: context.organizationId,
  });

  refresh();

  return result;
};
