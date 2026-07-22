import { NextRequest } from "next/server";
import { Types } from "mongoose";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { toJobDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { createJobSchema } from "@/lib/schemas/job";
import { STAGES, type Stage } from "@/lib/types";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const workspaceId = new Types.ObjectId(ctx.user.workspaceId);
  const jobs = await JobModel.find({ workspaceId }).sort({ createdAt: -1 }).exec();
  const grouped = await CandidateModel.aggregate<{ _id: { jobId: Types.ObjectId; stage: Stage }; count: number }>([
    { $match: { workspaceId, rejected: false } },
    { $group: { _id: { jobId: "$jobId", stage: "$stage" }, count: { $sum: 1 } } },
  ]);
  const emptyCounts = () => Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  const countsByJob = new Map<string, Record<Stage, number>>();
  for (const g of grouped) {
    const key = g._id.jobId.toString();
    const counts = countsByJob.get(key) ?? emptyCounts();
    counts[g._id.stage] = g.count;
    countsByJob.set(key, counts);
  }
  return Response.json(jobs.map((j) => toJobDto(j, countsByJob.get(j._id.toString()) ?? emptyCounts())));
});

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    const input = createJobSchema.parse(await req.json());
    const job = await JobModel.create({ ...input, workspaceId: ctx.user.workspaceId, createdBy: ctx.user.id });
    return Response.json(toJobDto(job), { status: 201 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);
