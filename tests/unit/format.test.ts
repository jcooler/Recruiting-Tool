import { describe, expect, it } from "vitest";
import { daysSince, formatDate, formatRelative } from "@/lib/format";

// Fixed reference instant used throughout so every assertion is deterministic
// regardless of the host machine's timezone or the real wall clock.
const NOW = new Date("2026-07-22T12:00:00.000Z");

describe("formatRelative", () => {
  it('returns "just now" for timestamps under a minute old', () => {
    expect(formatRelative(new Date(NOW.getTime() - 1000).toISOString(), NOW)).toBe("just now");
    expect(formatRelative(NOW.toISOString(), NOW)).toBe("just now");
  });

  it('returns "just now" for timestamps at or after "now" (clock skew / future)', () => {
    expect(formatRelative(new Date(NOW.getTime() + 5000).toISOString(), NOW)).toBe("just now");
  });

  it("returns minutes-ago just under the one-hour boundary", () => {
    expect(formatRelative(new Date(NOW.getTime() - 60_000).toISOString(), NOW)).toBe("1m ago");
    expect(formatRelative(new Date(NOW.getTime() - 45 * 60_000).toISOString(), NOW)).toBe("45m ago");
  });

  it("returns hours-ago from the one-hour boundary up to a day", () => {
    expect(formatRelative(new Date(NOW.getTime() - 60 * 60_000).toISOString(), NOW)).toBe("1h ago");
    expect(formatRelative(new Date(NOW.getTime() - 4 * 60 * 60_000).toISOString(), NOW)).toBe("4h ago");
    expect(formatRelative(new Date(NOW.getTime() - 23 * 60 * 60_000).toISOString(), NOW)).toBe("23h ago");
  });

  it("returns days-ago from the one-day boundary up to a week", () => {
    expect(formatRelative(new Date(NOW.getTime() - 24 * 60 * 60_000).toISOString(), NOW)).toBe("1d ago");
    expect(formatRelative(new Date(NOW.getTime() - 3 * 24 * 60 * 60_000).toISOString(), NOW)).toBe("3d ago");
    expect(formatRelative(new Date(NOW.getTime() - 6 * 24 * 60 * 60_000).toISOString(), NOW)).toBe("6d ago");
  });

  it("falls back to a short date at and beyond the seven-day boundary", () => {
    const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 60 * 60_000);
    expect(formatRelative(sevenDaysAgo.toISOString(), NOW)).toBe(formatDate(sevenDaysAgo.toISOString()));
  });

  it("defaults `now` to the current time when omitted", () => {
    expect(formatRelative(new Date().toISOString())).toBe("just now");
  });
});

describe("formatDate", () => {
  it("formats as short month + day, no year, no leading zero", () => {
    expect(formatDate("2026-06-02T15:00:00.000Z")).toBe("Jun 2");
    expect(formatDate("2026-01-09T00:00:00.000Z")).toBe("Jan 9");
    expect(formatDate("2025-12-25T23:59:59.000Z")).toBe("Dec 25");
  });
});

describe("daysSince", () => {
  it("returns 0 for a timestamp under a day old", () => {
    expect(daysSince(new Date(NOW.getTime() - 60_000).toISOString(), NOW)).toBe(0);
  });

  it("floors partial days", () => {
    expect(daysSince(new Date(NOW.getTime() - 36 * 60 * 60_000).toISOString(), NOW)).toBe(1);
  });

  it("returns whole-day counts for exact-day-multiple differences", () => {
    expect(daysSince(new Date(NOW.getTime() - 10 * 24 * 60 * 60_000).toISOString(), NOW)).toBe(10);
  });

  it("defaults `now` to the current time when omitted", () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });
});
