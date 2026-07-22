import { NextRequest } from "next/server";
import { Types, type FilterQuery } from "mongoose";
import CandidateModel, { type Candidate } from "@/models/candidate";
import JobModel from "@/models/job";
import { ApiError } from "@/lib/api-error";
import { activityEntry, escapeRegex } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { candidateListQuerySchema, createCandidateSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const q = candidateListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const filter: FilterQuery<Candidate> = {
    workspaceId: new Types.ObjectId(ctx.user.workspaceId),
    rejected: q.rejected === "true",
  };
  if (q.jobId) filter.jobId = new Types.ObjectId(q.jobId);
  if (q.stage) filter.stage = q.stage;
  if (q.tag) filter.tags = q.tag;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { skills: rx }];
  }
  const candidates = await CandidateModel.find(filter).sort({ updatedAt: -1 }).exec();
  return Response.json(candidates.map(toCandidateDto));
});

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    const { resumeText, ...input } = createCandidateSchema.parse(await req.json());
    const job = await JobModel.findOne({ _id: input.jobId, workspaceId: ctx.user.workspaceId }).exec();
    if (!job) throw new ApiError(404, "Job not found");

    const now = new Date();
    const activity = [activityEntry(ctx, "created", `added to ${job.title}`)];
    if (resumeText) activity.push(activityEntry(ctx, "resume-parsed", "resume text attached"));

    const candidate = await CandidateModel.create({
      ...input,
      workspaceId: ctx.user.workspaceId,
      createdBy: ctx.user.id,
      avatarSeed: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
      stageHistory: [{ stage: input.stage, enteredAt: now }],
      activity,
      ...(resumeText ? { resume: { text: resumeText, parsedFields: { skills: [] }, parsedAt: now } } : {}),
    });
    return Response.json(toCandidateDto(candidate), { status: 201 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
