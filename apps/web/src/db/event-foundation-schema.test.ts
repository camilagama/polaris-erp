import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(
  join(process.cwd(), "../../packages/db/src/schema.ts"),
  "utf8"
);

describe("event foundation schema", () => {
  it("models durable outbox and webhook events", () => {
    expect(schemaSource).toContain('"event_outbox"');
    expect(schemaSource).toContain('"webhook_events"');
    expect(schemaSource).toContain('correlationId: text("correlation_id")');
    expect(schemaSource).toContain('idempotencyKey: text("idempotency_key")');
    expect(schemaSource).toContain('rawBodySha256: text("raw_body_sha256")');
  });
});
