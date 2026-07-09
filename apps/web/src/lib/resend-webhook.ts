import "server-only";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import {
  recordResendEmailEvent,
  redactResendWebhookPayload,
} from "@/lib/email-service";
import { serverEnv } from "@/lib/env";
import {
  captureWebhookEvent,
  enqueueOutboxEvent,
} from "@/lib/event-foundation";
import { sendOutboxEventToInngest } from "@/lib/inngest-client";

const getWebhookHeaders = (request: Request) => {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!(id && timestamp && signature)) {
    return null;
  }

  return { id, signature, timestamp };
};

const toStringPayloadValue = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

export const handleResendWebhook = async (request: Request) => {
  if (!(serverEnv.RESEND_API_KEY && serverEnv.RESEND_WEBHOOK_SECRET)) {
    return NextResponse.json(
      { error: "Resend webhook is not configured." },
      { status: 503 }
    );
  }

  const webhookHeaders = getWebhookHeaders(request);

  if (!webhookHeaders) {
    return NextResponse.json(
      { error: "Missing Resend webhook headers." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const resend = new Resend(serverEnv.RESEND_API_KEY);

  try {
    const event = resend.webhooks.verify({
      headers: webhookHeaders,
      payload: rawBody,
      webhookSecret: serverEnv.RESEND_WEBHOOK_SECRET,
    });
    const payload = redactResendWebhookPayload(event);

    await captureWebhookEvent(db, {
      correlationId: webhookHeaders.id,
      eventId: webhookHeaders.id,
      headers: Object.fromEntries(request.headers.entries()),
      payload,
      provider: "resend",
      rawBody,
    });
    const outboxEventId = await enqueueOutboxEvent(db, {
      correlationId: webhookHeaders.id,
      eventType: toStringPayloadValue(payload.type, "unknown"),
      idempotencyKey: `resend-webhook:${webhookHeaders.id}`,
      payload,
      topic: "resend.webhook",
    });

    await sendOutboxEventToInngest(outboxEventId).catch(() => undefined);
    await recordResendEmailEvent(db, {
      event,
      providerEventId: webhookHeaders.id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid Resend webhook signature." },
      { status: 400 }
    );
  }
};
