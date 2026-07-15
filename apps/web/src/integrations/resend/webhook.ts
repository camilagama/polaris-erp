import "server-only";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { redactResendWebhookPayload } from "@/integrations/resend/email-service";
import { observeWebhookIntake } from "@/integrations/webhooks/intake";
import {
  isWebhookRequestTooLarge,
  readWebhookRequestBody,
} from "@/integrations/webhooks/request-limits";
import { serverEnv } from "@/lib/env";

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
  const resend = new Resend(serverEnv.RESEND_API_KEY);
  let event: ReturnType<typeof resend.webhooks.verify>;

  try {
    event = resend.webhooks.verify({
      headers: webhookHeaders,
      payload: rawBody,
      webhookSecret: serverEnv.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid Resend webhook signature." },
      { status: 400 }
    );
  }

  try {
    const redactedPayload = redactResendWebhookPayload(event);
    const payload = {
      ...redactedPayload,
      providerEventId: webhookHeaders.id,
    };

    const captureResult = await observeWebhookIntake({
      correlationId: webhookHeaders.id,
      eventId: webhookHeaders.id,
      eventType: toStringPayloadValue(redactedPayload.type, "unknown"),
      headers: Object.fromEntries(request.headers.entries()),
      payload,
      provider: "resend",
      rawBody,
    });

    if (captureResult === "duplicate") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process Resend webhook." },
      { status: 500 }
    );
  }
};
