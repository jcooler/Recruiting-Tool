import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import JobModel from "@/models/job";
import CandidateModel from "@/models/candidate";
import { computeAnalytics, type AnalyticsCandidate } from "@/lib/analytics";
import { GET } from "@/../app/api/analytics/route";

// Fixed "now" used throughout — 2026-07-20T00:00:00Z is itself a Monday, so
// weekStartUtc(now) === now, keeping the last-8-weeks math easy to verify by hand.
const NOW = new Date("2026-07-20T00:00:00Z");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe("computeAnalytics", () => {
  // Candidate A: hired, walked all 5 stages.
  //   applied   6/1
  //   screening 6/3   (gap since applied: 2d)
  //   interview 6/8   (gap since screening: 5d)
  //   offer     6/12  (gap since interview: 4d)
  //   hired     6/14  (gap since offer: 2d; last entry -> duration = now - 6/14 = 36d)
  const candidateA: AnalyticsCandidate = {
    stage: "hired",
    rejected: false,
    source: "referral",
    stageHistory: [
      { stage: "applied", enteredAt: day("2026-06-01") },
      { stage: "screening", enteredAt: day("2026-06-03") },
      { stage: "interview", enteredAt: day("2026-06-08") },
      { stage: "offer", enteredAt: day("2026-06-12") },
      { stage: "hired", enteredAt: day("2026-06-14") },
    ],
  };

  // Candidate B: rejected at screening.
  //   applied   6/5
  //   screening 6/10  (gap since applied: 5d; last entry -> duration = now - 6/10 = 40d)
  const candidateB: AnalyticsCandidate = {
    stage: "screening",
    rejected: true,
    source: "job-board",
    stageHistory: [
      { stage: "applied", enteredAt: day("2026-06-05") },
      { stage: "screening", enteredAt: day("2026-06-10") },
    ],
  };

  // Candidate C: active, still at applied only.
  //   applied 6/15 (last/only entry -> duration = now - 6/15 = 35d)
  const candidateC: AnalyticsCandidate = {
    stage: "applied",
    rejected: false,
    source: "referral",
    stageHistory: [{ stage: "applied", enteredAt: day("2026-06-15") }],
  };

  const candidates = [candidateA, candidateB, candidateC];

  it("funnel counts candidates whose stageHistory ever reached each stage, in stage order", () => {
    const result = computeAnalytics(candidates, 4, NOW);
    // applied: A, B, C all have an "applied" entry -> 3
    // screening: A and B reached it, C did not -> 2
    // interview/offer/hired: only A reached them -> 1 each
    expect(result.funnel).toEqual([
      { stage: "applied", count: 3 },
      { stage: "screening", count: 2 },
      { stage: "interview", count: 1 },
      { stage: "offer", count: 1 },
      { stage: "hired", count: 1 },
    ]);
  });

  it("timeInStage averages (next entry's enteredAt, or now for the last entry) minus enteredAt, over every stageHistory entry", () => {
    const result = computeAnalytics(candidates, 4, NOW);
    // applied entries: A 2d (6/1->6/3), B 5d (6/5->6/10), C 35d (6/15->now 7/20)
    //   avg = (2 + 5 + 35) / 3 = 42 / 3 = 14.0
    // screening entries: A 5d (6/3->6/8), B 40d (6/10->now 7/20, B's last entry)
    //   avg = (5 + 40) / 2 = 22.5
    // interview entries: A 4d (6/8->6/12) -- only entry -> avg 4.0
    // offer entries: A 2d (6/12->6/14) -- only entry -> avg 2.0
    // hired entries: A 36d (6/14->now 7/20, A's last entry) -- only entry -> avg 36.0
    expect(result.timeInStage).toEqual([
      { stage: "applied", avgDays: 14.0 },
      { stage: "screening", avgDays: 22.5 },
      { stage: "interview", avgDays: 4.0 },
      { stage: "offer", avgDays: 2.0 },
      { stage: "hired", avgDays: 36.0 },
    ]);
  });

  it("timeInStage includes every stage even when a stage has zero entries, defaulting avgDays to 0", () => {
    const onlyApplied: AnalyticsCandidate = {
      stage: "applied",
      rejected: false,
      source: "other",
      stageHistory: [{ stage: "applied", enteredAt: day("2026-07-01") }],
    };
    const result = computeAnalytics([onlyApplied], 0, NOW);
    expect(result.timeInStage).toEqual([
      { stage: "applied", avgDays: 19.0 }, // 7/1 -> now 7/20 = 19d, only/last entry
      { stage: "screening", avgDays: 0 },
      { stage: "interview", avgDays: 0 },
      { stage: "offer", avgDays: 0 },
      { stage: "hired", avgDays: 0 },
    ]);
  });

  it("bySource counts all candidates by source and sorts descending, omitting absent sources", () => {
    const result = computeAnalytics(candidates, 4, NOW);
    // referral: A + C = 2; job-board: B = 1
    expect(result.bySource).toEqual([
      { source: "referral", count: 2 },
      { source: "job-board", count: 1 },
    ]);
  });

  it("velocity buckets stageHistory entries beyond each candidate's first into the last 8 ISO (Mon UTC) weeks, zero-filled, oldest first", () => {
    const result = computeAnalytics(candidates, 4, NOW);
    // Moves = stageHistory[index >= 1] for each candidate (the entry that first
    // put them there doesn't count, only subsequent moves do):
    //   A: screening 6/3  -> week of 6/1 (Mon)
    //      interview 6/8  -> week of 6/8 (Mon)
    //      offer     6/12 -> week of 6/8
    //      hired     6/14 -> week of 6/8
    //   B: screening 6/10 -> week of 6/8
    //   C: no entries beyond index 0 -> contributes nothing
    // => week 2026-06-01: 1 move; week 2026-06-08: 4 moves; all other weeks: 0
    expect(result.velocity).toEqual([
      { weekStart: "2026-06-01", moves: 1 },
      { weekStart: "2026-06-08", moves: 4 },
      { weekStart: "2026-06-15", moves: 0 },
      { weekStart: "2026-06-22", moves: 0 },
      { weekStart: "2026-06-29", moves: 0 },
      { weekStart: "2026-07-06", moves: 0 },
      { weekStart: "2026-07-13", moves: 0 },
      { weekStart: "2026-07-20", moves: 0 },
    ]);
  });

  it("totals: candidates counts everyone, active excludes rejected and hired, hired excludes rejected, openJobs passes through", () => {
    const result = computeAnalytics(candidates, 4, NOW);
    // A: stage hired, not rejected -> hired (not active, since active excludes stage === "hired")
    // B: rejected -> counted in rejected only, not active, not hired
    // C: not rejected, stage applied -> active
    expect(result.totals).toEqual({
      candidates: 3,
      active: 1,
      hired: 1,
      rejected: 1,
      openJobs: 4,
    });
  });

  it("handles an empty candidate list", () => {
    const result = computeAnalytics([], 2, NOW);
    expect(result.funnel).toEqual([
      { stage: "applied", count: 0 },
      { stage: "screening", count: 0 },
      { stage: "interview", count: 0 },
      { stage: "offer", count: 0 },
      { stage: "hired", count: 0 },
    ]);
    expect(result.timeInStage.every((t) => t.avgDays === 0)).toBe(true);
    expect(result.bySource).toEqual([]);
    expect(result.velocity).toHaveLength(8);
    expect(result.velocity.every((w) => w.moves === 0)).toBe(true);
    expect(result.totals).toEqual({ candidates: 0, active: 0, hired: 0, rejected: 0, openJobs: 2 });
  });
});

describe("GET /api/analytics", () => {
  setupTestDb();
  const P = routeParams();

  it("returns 200 with totals.candidates matching the seeded candidate count", async () => {
    const { token, user, workspace } = await makeUser("recruiter");
    const job = await JobModel.create({
      workspaceId: workspace._id,
      title: "Software Engineer",
      department: "Engineering",
      location: "Remote",
      employmentType: "full-time",
      createdBy: user._id,
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Alice", email: "alice@x.com",
      avatarSeed: "alice", source: "referral", stage: "applied", createdBy: user._id,
      stageHistory: [{ stage: "applied", enteredAt: new Date() }],
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Bob", email: "bob@x.com",
      avatarSeed: "bob", source: "job-board", stage: "screening", createdBy: user._id,
      stageHistory: [
        { stage: "applied", enteredAt: new Date(Date.now() - 86_400_000) },
        { stage: "screening", enteredAt: new Date() },
      ],
    });
    await CandidateModel.create({
      workspaceId: workspace._id, jobId: job._id, name: "Carol", email: "carol@x.com",
      avatarSeed: "carol", source: "referral", stage: "hired", createdBy: user._id,
      stageHistory: [{ stage: "applied", enteredAt: new Date() }, { stage: "hired", enteredAt: new Date() }],
    });

    const res = await GET(apiReq("GET", "/api/analytics", { token }), P);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals.candidates).toBe(3);
  });
});
