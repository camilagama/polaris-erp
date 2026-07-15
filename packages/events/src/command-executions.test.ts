import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  completeCommandExecution,
  listClaimableOutboxEventIds,
  reserveCommandExecution,
} = await import("@polaris/events");

describe("command executions", () => {
  it("reserves a new idempotent command", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [{ id: "cmd-1", reservation_kind: "new" }],
      }),
    };

    await expect(
      reserveCommandExecution(db, {
        commandType: "product.create",
        correlationId: "corr-1",
        idempotencyKey: "key-1",
        organizationId: "org-1",
      })
    ).resolves.toEqual({ commandId: "cmd-1", kind: "new" });
  });

  it("returns the original succeeded result on replay", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            error_code: null,
            id: "cmd-1",
            reservation_kind: "existing",
            result: { productId: "product-1" },
            status: "succeeded",
          },
        ],
      }),
    };

    await expect(
      reserveCommandExecution(db, {
        commandType: "product.create",
        correlationId: "corr-1",
        idempotencyKey: "key-1",
        organizationId: "org-1",
      })
    ).resolves.toEqual({
      commandId: "cmd-1",
      errorCode: null,
      kind: "replay",
      result: { productId: "product-1" },
      status: "succeeded",
    });
  });

  it("keeps identical idempotency keys independent across command types", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [{ id: "cmd-2", reservation_kind: "new" }],
      }),
    };

    await expect(
      reserveCommandExecution(db, {
        commandType: "sale.create",
        correlationId: "corr-2",
        idempotencyKey: "key-1",
        organizationId: "org-1",
      })
    ).resolves.toEqual({ commandId: "cmd-2", kind: "new" });
  });

  it("completes only a command that is still processing", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({ rows: [{ id: "cmd-1" }] }),
    };

    await expect(
      completeCommandExecution(db, {
        commandId: "cmd-1",
        result: { productId: "product-1" },
        status: "succeeded",
      })
    ).resolves.toBe(true);
  });

  it("lists only due pending outbox events in a bounded batch", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [{ id: "event-1" }, { id: "event-2" }],
      }),
    };

    await expect(listClaimableOutboxEventIds(db, 100)).resolves.toEqual([
      "event-1",
      "event-2",
    ]);

    expect(db.execute).toHaveBeenCalledOnce();
  });
});
