import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEnv", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    (await import("@/lib/env")).resetEnvCache();
  });

  it("returns validated env when all vars present", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));
    const { getEnv } = await import("@/lib/env");
    expect(getEnv().MONGODB_URI).toBe("mongodb://localhost/x");
  });

  it("throws naming the missing/invalid var", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
    vi.stubEnv("SESSION_SECRET", "short");
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });
});
