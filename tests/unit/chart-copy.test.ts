import { describe, expect, it } from "vitest";
import { funnelTakeaway, sourceTakeaway, timeInStageTakeaway, velocityTakeaway } from "@/components/analytics/chart-copy";

describe("funnelTakeaway", () => {
  it("reports hired/applied as a rounded whole percent", () => {
    const funnel = [
      { stage: "applied" as const, count: 3 },
      { stage: "screening" as const, count: 2 },
      { stage: "interview" as const, count: 1 },
      { stage: "offer" as const, count: 1 },
      { stage: "hired" as const, count: 1 },
    ];
    // 1/3 = 33.33...% -> rounds to 33%
    expect(funnelTakeaway(funnel)).toBe("33% of candidates who applied have been hired.");
  });

  it("reports 0% when nobody has been hired", () => {
    const funnel = [
      { stage: "applied" as const, count: 5 },
      { stage: "screening" as const, count: 0 },
      { stage: "interview" as const, count: 0 },
      { stage: "offer" as const, count: 0 },
      { stage: "hired" as const, count: 0 },
    ];
    expect(funnelTakeaway(funnel)).toBe("0% of candidates who applied have been hired.");
  });

  it("guards divide-by-zero when applied is 0", () => {
    const funnel = [
      { stage: "applied" as const, count: 0 },
      { stage: "screening" as const, count: 0 },
      { stage: "interview" as const, count: 0 },
      { stage: "offer" as const, count: 0 },
      { stage: "hired" as const, count: 0 },
    ];
    expect(funnelTakeaway(funnel)).toBe("No candidates in the funnel yet.");
  });
});

describe("timeInStageTakeaway", () => {
  it("names the stage with the highest avgDays", () => {
    const timeInStage = [
      { stage: "applied" as const, avgDays: 2 },
      { stage: "screening" as const, avgDays: 22.5 },
      { stage: "interview" as const, avgDays: 4 },
      { stage: "offer" as const, avgDays: 2 },
      { stage: "hired" as const, avgDays: 0 },
    ];
    expect(timeInStageTakeaway(timeInStage)).toBe("Candidates spend the longest in Screening, averaging 22.5 days.");
  });

  it("breaks ties by keeping the earliest stage in pipeline order", () => {
    const timeInStage = [
      { stage: "applied" as const, avgDays: 5 },
      { stage: "screening" as const, avgDays: 5 },
      { stage: "interview" as const, avgDays: 0 },
      { stage: "offer" as const, avgDays: 0 },
      { stage: "hired" as const, avgDays: 0 },
    ];
    expect(timeInStageTakeaway(timeInStage)).toBe("Candidates spend the longest in Applied, averaging 5 days.");
  });

  it("falls back when every stage averages 0 days", () => {
    const timeInStage = [
      { stage: "applied" as const, avgDays: 0 },
      { stage: "screening" as const, avgDays: 0 },
      { stage: "interview" as const, avgDays: 0 },
      { stage: "offer" as const, avgDays: 0 },
      { stage: "hired" as const, avgDays: 0 },
    ];
    expect(timeInStageTakeaway(timeInStage)).toBe("No stage-duration data yet.");
  });

  it("falls back on an empty array", () => {
    expect(timeInStageTakeaway([])).toBe("No stage-duration data yet.");
  });
});

describe("sourceTakeaway", () => {
  it("names the highest-count source, singular candidate count", () => {
    expect(sourceTakeaway([{ source: "referral" as const, count: 1 }])).toBe(
      "Referral is the leading source, with 1 candidate."
    );
  });

  it("names the highest-count source, plural candidate count, regardless of input order", () => {
    const bySource = [
      { source: "job-board" as const, count: 3 },
      { source: "referral" as const, count: 7 },
      { source: "other" as const, count: 2 },
    ];
    expect(sourceTakeaway(bySource)).toBe("Referral is the leading source, with 7 candidates.");
  });

  it("falls back on an empty array", () => {
    expect(sourceTakeaway([])).toBe("No source data yet.");
  });
});

describe("velocityTakeaway", () => {
  it("reports an upward trend vs the prior week", () => {
    const velocity = [
      { weekStart: "2026-07-06", moves: 2 },
      { weekStart: "2026-07-13", moves: 3 },
      { weekStart: "2026-07-20", moves: 6 },
    ];
    expect(velocityTakeaway(velocity)).toBe("Pipeline velocity is up this week — 6 vs 3 last week.");
  });

  it("reports a downward trend vs the prior week", () => {
    const velocity = [
      { weekStart: "2026-07-13", moves: 6 },
      { weekStart: "2026-07-20", moves: 2 },
    ];
    expect(velocityTakeaway(velocity)).toBe("Pipeline velocity is down this week — 2 vs 6 last week.");
  });

  it("reports flat when this week matches last week, pluralizing correctly", () => {
    const velocity = [
      { weekStart: "2026-07-13", moves: 1 },
      { weekStart: "2026-07-20", moves: 1 },
    ];
    expect(velocityTakeaway(velocity)).toBe("Pipeline velocity is flat — 1 stage move this week, same as last week.");
  });

  it("falls back to a single-week phrasing when there is only one week of data", () => {
    expect(velocityTakeaway([{ weekStart: "2026-07-20", moves: 4 }])).toBe("4 stage moves this week.");
  });

  it("falls back on an empty array", () => {
    expect(velocityTakeaway([])).toBe("No pipeline movement recorded yet.");
  });
});
