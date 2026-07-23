// Pure "raw analytics numbers -> one-line figcaption takeaway" helpers, split
// out of charts.tsx (same rationale as src/components/candidate/activity-text.ts
// and src/components/pipeline/column-coordinates.ts: logic with real edge
// cases — empty data, ties, division by zero — belongs in a plain .ts module
// so it's unit-testable without dragging Recharts/JSX into the test).
import type { AnalyticsData } from "@/lib/analytics";
import { SOURCE_LABELS, STAGE_LABELS } from "@/lib/types";

type Funnel = AnalyticsData["funnel"];
type TimeInStage = AnalyticsData["timeInStage"];
type BySource = AnalyticsData["bySource"];
type Velocity = AnalyticsData["velocity"];

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** Hired ÷ applied, as a whole-percent conversion line. Guards the (practically unreachable, since the empty-workspace state gates first) applied === 0 case rather than emitting NaN%/Infinity%. */
export function funnelTakeaway(funnel: Funnel): string {
  const applied = funnel.find((f) => f.stage === "applied")?.count ?? 0;
  const hired = funnel.find((f) => f.stage === "hired")?.count ?? 0;
  if (applied === 0) return "No candidates in the funnel yet.";
  const pct = Math.round((hired / applied) * 100);
  return `${pct}% of candidates who applied have been hired.`;
}

/** Names the slowest stage. Ties keep the earliest stage in pipeline order (strict `>` never displaces the running max). */
export function timeInStageTakeaway(timeInStage: TimeInStage): string {
  if (timeInStage.length === 0) return "No stage-duration data yet.";
  const slowest = timeInStage.reduce((max, cur) => (cur.avgDays > max.avgDays ? cur : max));
  if (slowest.avgDays === 0) return "No stage-duration data yet.";
  return `Candidates spend the longest in ${STAGE_LABELS[slowest.stage]}, averaging ${slowest.avgDays} days.`;
}

/** Names the top source by count. Recomputed defensively rather than trusting callers to pass `bySource` still sorted descending. */
export function sourceTakeaway(bySource: BySource): string {
  if (bySource.length === 0) return "No source data yet.";
  const top = bySource.reduce((max, cur) => (cur.count > max.count ? cur : max));
  return `${SOURCE_LABELS[top.source]} is the leading source, with ${plural(top.count, "candidate")}.`;
}

/** Compares the most recent week's moves against the prior week. */
export function velocityTakeaway(velocity: Velocity): string {
  if (velocity.length === 0) return "No pipeline movement recorded yet.";
  const last = velocity[velocity.length - 1];
  const prev = velocity.length > 1 ? velocity[velocity.length - 2] : undefined;
  if (!prev) return `${plural(last.moves, "stage move")} this week.`;
  if (last.moves > prev.moves) return `Pipeline velocity is up this week — ${last.moves} vs ${prev.moves} last week.`;
  if (last.moves < prev.moves) return `Pipeline velocity is down this week — ${last.moves} vs ${prev.moves} last week.`;
  return `Pipeline velocity is flat — ${plural(last.moves, "stage move")} this week, same as last week.`;
}
