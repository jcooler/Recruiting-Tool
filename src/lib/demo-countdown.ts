/**
 * Pure, exported for unit testing. `now` is threaded in (rather than read
 * internally via `Date.now()`) so the result is deterministic and the
 * component's re-render-every-minute tick is what drives freshness, not a
 * hidden read inside this function.
 */
export function formatDemoCountdown(expiresAt: string | undefined, now: number): string {
  if (!expiresAt) return "soon";
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "any moment";

  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
