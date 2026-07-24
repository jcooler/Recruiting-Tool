import type { CandidateDto } from "@/lib/dto";
import { SOURCES, STAGES, type Source, type Stage } from "@/lib/types";

export interface AnalyticsData {
  funnel: { stage: Stage; count: number }[]; // candidates whose stageHistory EVER reached stage
  timeInStage: { stage: Stage; avgDays: number }[]; // avg of (next entry enteredAt | now) - enteredAt, per stage; 1 decimal
  bySource: { source: Source; count: number }[]; // all sources present, desc by count
  velocity: { weekStart: string; moves: number }[]; // last 8 ISO weeks (Mon, YYYY-MM-DD), stageHistory entries beyond the first
  totals: { candidates: number; active: number; hired: number; rejected: number; openJobs: number };
}

export type AnalyticsCandidate = Pick<CandidateDto, "stage" | "rejected" | "source"> & {
  stageHistory: { stage: Stage; enteredAt: Date }[];
};

function weekStartUtc(d: Date): Date {
  const x = new Date(d);
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

const MS_PER_DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeAnalytics(candidates: AnalyticsCandidate[], openJobs: number, now: Date): AnalyticsData {
  const funnel = STAGES.map((stage) => ({
    stage,
    count: candidates.filter((c) => c.stageHistory.some((h) => h.stage === stage)).length,
  }));

  const stageDurations = new Map<Stage, number[]>(STAGES.map((s) => [s, []]));
  for (const c of candidates) {
    c.stageHistory.forEach((entry, i) => {
      const next = c.stageHistory[i + 1];
      const endMs = next ? next.enteredAt.getTime() : now.getTime();
      const durationDays = (endMs - entry.enteredAt.getTime()) / MS_PER_DAY;
      stageDurations.get(entry.stage)!.push(durationDays);
    });
  }
  const timeInStage = STAGES.map((stage) => {
    const durations = stageDurations.get(stage)!;
    const avgDays = durations.length ? round1(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0;
    return { stage, avgDays };
  });

  const sourceCounts = new Map<Source, number>();
  for (const c of candidates) {
    sourceCounts.set(c.source, (sourceCounts.get(c.source) ?? 0) + 1);
  }
  const bySource = SOURCES.filter((source) => sourceCounts.has(source))
    .map((source) => ({ source, count: sourceCounts.get(source)! }))
    .sort((a, b) => b.count - a.count);

  const nowWeekStart = weekStartUtc(now);
  const weekKeys: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(nowWeekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
    weekKeys.push(weekStart.toISOString().slice(0, 10));
  }
  const moveCounts = new Map<string, number>(weekKeys.map((k) => [k, 0]));
  for (const c of candidates) {
    for (let i = 1; i < c.stageHistory.length; i++) {
      const key = weekStartUtc(c.stageHistory[i].enteredAt).toISOString().slice(0, 10);
      if (moveCounts.has(key)) moveCounts.set(key, moveCounts.get(key)! + 1);
    }
  }
  const velocity = weekKeys.map((weekStart) => ({ weekStart, moves: moveCounts.get(weekStart)! }));

  const totals = {
    candidates: candidates.length,
    active: candidates.filter((c) => !c.rejected && c.stage !== "hired").length,
    hired: candidates.filter((c) => c.stage === "hired" && !c.rejected).length,
    rejected: candidates.filter((c) => c.rejected).length,
    openJobs,
  };

  return { funnel, timeInStage, bySource, velocity, totals };
}
