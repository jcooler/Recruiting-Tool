import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { consumeRateLimit } from "@/lib/rate-limit";

setupTestDb();

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks with retryAfter", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await consumeRateLimit("k1", 3, 60_000)).allowed).toBe(true);
    }
    const blocked = await consumeRateLimit("k1", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("separate keys do not interfere", async () => {
    await consumeRateLimit("a", 1, 60_000);
    expect((await consumeRateLimit("b", 1, 60_000)).allowed).toBe(true);
  });

  it("resets after the window lapses", async () => {
    await consumeRateLimit("c", 1, 50); // 50ms window
    await new Promise((r) => setTimeout(r, 80));
    expect((await consumeRateLimit("c", 1, 50)).allowed).toBe(true);
  });
});
