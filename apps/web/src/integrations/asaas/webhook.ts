import "server-only";

import { NextResponse } from "next/server";
import { observeWebhookIntake } from "@/integrations/webhooks/intake";
import {
  isWebhookRequestTooLarge,
  readWebhookRequestBody,
} from "@/integrations/webhooks/request-limits";
import { serverEnv } from "@/lib/env";

const ACCESS_TOKEN_HEADER = "asaas-access-token";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRecord = (
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> => {
  const value = record[key];

  return isRecord(value) ? value : {};
};

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];

  return typeof value === "string" && value.length > 0 ? value : null;
};

const getNumber = (
  record: Record<string, unknown>,
  key: string
): number | null => {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const parseJsonPayload = (rawBody: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(rawBody);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getAsaasWebhookEventId = (
  payload: Record<string, unknown>
): string | null => {
  const payment = getRecord(payload, "payment");
  const subscription = getRecord(payload, "subscription");

  return (
    getString(payload, "id") ??
    getString(payment, "id") ??
    getString(subscription, "id")
  );
};

export const redactAsaasWebhookPayload = (
  payload: Record<string, unknown>
): Record<string, unknown> => {
  const payment = getRecord(payload, "payment");
  const subscription = getRecord(payload, "subscription");
  const creditCard = getRecord(payment, "creditCard");

  return {
    dateCreated: getString(payload, "dateCreated"),
    event: getString(payload, "event"),
    id: getString(payload, "id"),
    payment: {
      billingType: getString(payment, "billingType"),
      externalReference: getString(payment, "externalReference"),
      id: getString(payment, "id"),
      status: getString(payment, "status"),
      subscription: getString(payment, "subscription"),
      value: getNumber(payment, "value"),
    },
    paymentMethod: {
      brand: getString(creditCard, "creditCardBrand"),
      last4: getString(creditCard, "creditCardNumber")?.slice(-4) ?? null,
    },
    subscription: {
      externalReference: getString(subscription, "externalReference"),
      id: getString(subscription, "id"),
      status: getString(subscription, "status"),
      value: getNumber(subscription, "value"),
    },
  };
};

export const handleAsaasWebhook = async (request: Request) => {
  if (!serverEnv.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json(
      { error: "Asaas webhook is not configured." },
      { status: 503 }
    );
  }

  if (
    request.headers.get(ACCESS_TOKEN_HEADER) !== serverEnv.ASAAS_WEBHOOK_TOKEN
  ) {
    return NextResponse.json(
      { error: "Invalid Asaas webhook token." },
      { status: 401 }
    );
  }

  if (isWebhookRequestTooLarge(request)) {
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 }
    );
  }

  const rawBody = await readWebhookRequestBody(request);

  if (rawBody === null) {
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 }
    );
  }
  const payload = parseJsonPayload(rawBody);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid Asaas webhook payload." },
      { status: 400 }
    );
  }

  const eventId = getAsaasWebhookEventId(payload);

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing Asaas webhook event id." },
      { status: 400 }
    );
  }

  const redactedPayload = redactAsaasWebhookPayload(payload);

  const captureResult = await observeWebhookIntake({
    eventId,
    eventType: getString(payload, "event") ?? "unknown",
    headers: Object.fromEntries(request.headers.entries()),
    payload: { ...redactedPayload, providerEventId: eventId },
    provider: "asaas",
    rawBody,
  });

  if (captureResult === "duplicate") {
    return NextResponse.json({ duplicate: true });
  }

  return NextResponse.json({ accepted: true });
};
