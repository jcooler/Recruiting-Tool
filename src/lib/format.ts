// Pure date/time formatting helpers shared by the dashboard (KPI tiles,
// activity feed) and any other screen that needs to render a timestamp.
// `now` is threaded in as an optional argument (rather than read internally
// via `new Date()`) so callers can pin it in tests — same convention as
// `formatDemoCountdown` in `src/lib/demo-countdown.ts`.

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Short, year-less date: "Jun 2". Formatted from UTC fields so the result never depends on the host timezone. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Whole days between `iso` and `now` (floored). Never negative — a timestamp at or after `now` returns 0. */
export function daysSince(iso: string, now: Date = new Date()): number {
  const diffMs = Math.max(now.getTime() - new Date(iso).getTime(), 0);
  return Math.floor(diffMs / DAY_MS);
}

/**
 * Relative time for activity/feed rows: "just now" under a minute, then
 * "Nm ago" / "Nh ago" / "Nd ago" up to a week, then a short date ("Jun 2").
 * A timestamp at or after `now` (clock skew, or `now` passed as exactly
 * `iso`) also reads as "just now" rather than a negative duration.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = Math.max(now.getTime() - new Date(iso).getTime(), 0);

  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)}d ago`;
  return formatDate(iso);
}
