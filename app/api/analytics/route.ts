import { Types } from "mongoose";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { computeAnalytics, type AnalyticsCandidate } from "@/lib/analytics";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = new Types.ObjectId(ctx.user.workspaceId);
  const docs = await CandidateModel.find({ workspaceId }).select("stage rejected source stageHistory").lean().exec();
  const candidates: AnalyticsCandidate[] = docs.map((d) => ({
    stage: d.stage,
    rejected: d.rejected,
    source: d.source,
    stageHistory: d.stageHistory.map((h) => ({ stage: h.stage, enteredAt: h.enteredAt })),
  }));
  const openJobs = await JobModel.countDocuments({ workspaceId, status: "open" });
  return Response.json(computeAnalytics(candidates, openJobs, new Date()));
});
