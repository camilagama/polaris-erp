import "server-only";

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reconcileAsaasBillingEvent } from "@/lib/asaas-billing-reconciliation";
import { serverEnv } from "@/lib/env";
import { captureWebhookEvent } from "@/lib/event-foundation";

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
    event: getString(payload, "event"),
    id: getString(payload, "id"),
    payment: {
      billingType: getString(payment, "billingType"),
      id: getString(payment, "id"),
      status: getString(payment, "status"),
      subscription: getString(payment, "subscription"),
    },
    paymentMethod: {
      brand: getString(creditCard, "creditCardBrand"),
      last4: getString(creditCard, "creditCardNumber")?.slice(-4) ?? null,
    },
    subscription: {
      id: getString(subscription, "id"),
      status: getString(subscription, "status"),
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

  const rawBody = await request.text();
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

  await captureWebhookEvent(db, {
    correlationId: eventId,
    eventId,
    headers: Object.fromEntries(request.headers.entries()),
    payload: redactAsaasWebhookPayload(payload),
    provider: "asaas",
    rawBody,
  });
  const reconciliationStatus = await reconcileAsaasBillingEvent(
    db,
    payload,
    eventId
  );

  await db.execute(sql`
    update webhook_events
    set status = ${reconciliationStatus === "processed" ? "processed" : "failed"},
        processed_at = now(),
        last_error = ${reconciliationStatus === "processed" ? null : "manual_review"},
        updated_at = now()
    where provider = 'asaas'
      and provider_event_id = ${eventId}
  `);

  return NextResponse.json({});
};
