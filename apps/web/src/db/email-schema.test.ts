import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(
  join(process.cwd(), "../../packages/db/src/schema.ts"),
  "utf8"
);

describe("email schema", () => {
  it("models email message and provider event logs", () => {
    expect(schemaSource).toContain('"email_messages"');
    expect(schemaSource).toContain('"email_events"');
    expect(schemaSource).toContain('templateVersion: text("template_version")');
    expect(schemaSource).toContain(
      'providerMessageId: text("provider_message_id")'
    );
  });
});
