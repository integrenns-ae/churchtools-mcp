import { describe, expect, it, vi } from "vitest";
import { requireWriteConfirmation } from "../src/tools/confirmation.js";

describe("write confirmation", () => {
  it("passes when confirm is already true", async () => {
    await expect(
      requireWriteConfirmation(undefined, {
        confirm: true,
        operation: "PUT /events/{eventId}",
        target: "event 1",
        preview: { note: "Updated" }
      })
    ).resolves.toEqual({ confirmed: true });
  });

  it("returns a confirmation_required fallback when elicitation is unavailable", async () => {
    const result = await requireWriteConfirmation(undefined, {
      operation: "PUT /events/{eventId}",
      target: "event 1",
      preview: { note: "Updated" }
    });

    expect(result.confirmed).toBe(false);
    if (!result.confirmed) {
      expect(result.result.structuredContent?.status).toBe("confirmation_required");
    }
  });

  it("uses elicitation when available", async () => {
    const host = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: vi.fn(async () => ({ action: "accept" as const, content: { confirm: true } }))
    };

    const result = await requireWriteConfirmation(host, {
      operation: "PUT /events/{eventId}",
      target: "event 1",
      preview: { note: "Updated" }
    });

    expect(result).toEqual({ confirmed: true });
    expect(host.elicitInput).toHaveBeenCalledOnce();
  });

  it("cancels when elicitation is declined", async () => {
    const host = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: vi.fn(async () => ({ action: "decline" as const }))
    };

    const result = await requireWriteConfirmation(host, {
      operation: "PUT /events/{eventId}",
      target: "event 1",
      preview: { note: "Updated" }
    });

    expect(result.confirmed).toBe(false);
    if (!result.confirmed) {
      expect(result.result.structuredContent?.status).toBe("declined");
    }
  });
});
