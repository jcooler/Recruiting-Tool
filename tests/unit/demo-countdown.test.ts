import { describe, expect, it } from "vitest";
import { formatDemoCountdown } from "@/lib/demo-countdown";

describe("formatDemoCountdown", () => {
  const now = 1000000000; // Arbitrary fixed timestamp in milliseconds

  it("returns 'soon' when expiresAt is undefined", () => {
    const result = formatDemoCountdown(undefined, now);
    expect(result).toBe("soon");
  });

  it("returns 'any moment' when already expired (ms <= 0)", () => {
    const pastExpiry = new Date(now - 1000).toISOString();
    const result = formatDemoCountdown(pastExpiry, now);
    expect(result).toBe("any moment");
  });

  it("returns 'any moment' when expiry is exactly now", () => {
    const exactExpiry = new Date(now).toISOString();
    const result = formatDemoCountdown(exactExpiry, now);
    expect(result).toBe("any moment");
  });

  it("returns minutes-only format for near-expiry under 1 hour", () => {
    // 45 minutes from now
    const futureExpiry = new Date(now + 45 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("45m");
  });

  it("returns single minute for near-expiry", () => {
    // 1 minute from now
    const futureExpiry = new Date(now + 1 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("1m");
  });

  it("rounds up to 1 minute for expiry within a minute", () => {
    // 30 seconds from now (rounds up to 1 minute)
    const futureExpiry = new Date(now + 30_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("1m");
  });

  it("returns hours and minutes for multi-hour expiry", () => {
    // 3 hours 45 minutes from now
    const futureExpiry = new Date(now + 3 * 60 * 60_000 + 45 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("3h 45m");
  });

  it("returns hours-only when expiry is exactly on the hour", () => {
    // 2 hours from now, 0 minutes
    const futureExpiry = new Date(now + 2 * 60 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("2h");
  });

  it("returns 1h with minutes for just over 1 hour", () => {
    // 1 hour 30 minutes from now
    const futureExpiry = new Date(now + 60 * 60_000 + 30 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("1h 30m");
  });

  it("returns 1h with 1m for just over 1 hour by a single minute", () => {
    // 1 hour 1 minute from now
    const futureExpiry = new Date(now + 60 * 60_000 + 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("1h 1m");
  });

  it("handles large hour counts (e.g., 24 hours)", () => {
    // 24 hours from now
    const futureExpiry = new Date(now + 24 * 60 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("24h");
  });

  it("handles 10+ hours with minutes", () => {
    // 10 hours 15 minutes from now
    const futureExpiry = new Date(now + 10 * 60 * 60_000 + 15 * 60_000).toISOString();
    const result = formatDemoCountdown(futureExpiry, now);
    expect(result).toBe("10h 15m");
  });
});
