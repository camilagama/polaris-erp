import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { serverEnv } from "@/lib/env";
import {
  captureWebhookEvent,
  enqueueOutboxEvent,
} from "@/lib/event-foundation";
import { sendOutboxEventToInngest } from "@/lib/inngest-client";
import { reconcileWooviBillingEvent } from "@/lib/woovi-billing-reconciliation";

const SIGNATURE_HEADER = "x-webhook-signature";
const SHA256_PREFIX_PATTERN = /^sha256=/i;

const normalizeSignature = (signature: string): string =>
  signature.trim().replace(SHA256_PREFIX_PATTERN, "");

const safeCompare = (received: string, expected: string): boolean => {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

export const verifyWooviWebhookSignature = ({
  rawBody,
  secret,
  signature,
}: {
  rawBody: string;
  secret: string;
  signature: string;
}): boolean => {
  const normalizedSignature = normalizeSignature(signature);
  const hexDigest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const base64Digest = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  return (
    safeCompare(normalizedSignature, hexDigest) ||
    safeCompare(normalizedSignature, base64Digest)
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];

  return typeof value === "string" && value.length > 0 ? value : null;
};

export const getWooviWebhookEventId = (
  payload: Record<string, unknown>
): string | null => {
  const cobr = isRecord(payload.cobr) ? payload.cobr : {};

  return (
    getString(payload, "globalID") ??
    getString(payload, "paymentSubscriptionGlobalID") ??
    getString(cobr, "identifierId") ??
    getString(payload, "correlationID")
  );
};

export const redactWooviWebhookPayload = (
  payload: Record<string, unknown>
): Record<string, unknown> => ({
  correlationID: getString(payload, "correlationID"),
  event: getString(payload, "event"),
  globalID: getString(payload, "globalID"),
  paymentSubscriptionGlobalID: getString(
    payload,
    "paymentSubscriptionGlobalID"
  ),
  status: getString(payload, "status"),
});

const parseJsonPayload = (rawBody: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(rawBody);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const handleWooviWebhook = async (request: Request) => {
  if (!serverEnv.WOOVI_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Woovi webhook is not configured." },
      { status: 503 }
    );
  }

  const signature = request.headers.get(SIGNATURE_HEADER);

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Woovi webhook signature." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  if (
    !verifyWooviWebhookSignature({
      rawBody,
      secret: serverEnv.WOOVI_WEBHOOK_SECRET,
      signature,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid Woovi webhook signature." },
      { status: 400 }
    );
  }

  const payload = parseJsonPayload(rawBody);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid Woovi webhook payload." },
      { status: 400 }
    );
  }

  const eventId = getWooviWebhookEventId(payload);

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing Woovi webhook event id." },
      { status: 400 }
    );
  }

  const correlationId = getString(payload, "correlationID") ?? eventId;
  const redactedPayload = redactWooviWebhookPayload(payload);

  await captureWebhookEvent(db, {
    correlationId,
    eventId,
    headers: Object.fromEntries(request.headers.entries()),
    payload: redactedPayload,
    provider: "woovi",
    rawBody,
  });

  const outboxEventId = await enqueueOutboxEvent(db, {
    correlationId,
    eventType: getString(payload, "event") ?? "unknown",
    idempotencyKey: `woovi-webhook:${eventId}`,
    payload: redactedPayload,
    topic: "woovi.webhook",
  });
  await sendOutboxEventToInngest(outboxEventId).catch(() => undefined);

  const reconciliationStatus = await reconcileWooviBillingEvent(
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
    where provider = 'woovi'
      and provider_event_id = ${eventId}
  `);

  return NextResponse.json({ ok: true });
};
