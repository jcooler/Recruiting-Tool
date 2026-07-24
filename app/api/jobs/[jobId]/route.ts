import { NextRequest } from "next/server";
import CandidateModel from "@/models/candidate";
import JobModel from "@/models/job";
import { ApiError } from "@/lib/api-error";
import { toJobDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { objectIdSchema } from "@/lib/schemas/common";
import { updateJobSchema } from "@/lib/schemas/job";
import { withAuth, type AuthCtx } from "@/lib/with-auth";

export const runtime = "nodejs";

async function findJobOr404(ctx: AuthCtx) {
  const jobId = objectIdSchema.parse(ctx.params.jobId);
  const job = await JobModel.findOne({ _id: jobId, workspaceId: ctx.user.workspaceId }).exec();
  if (!job) throw new ApiError(404, "Job not found");
  return job;
}

export const GET = withAuth(async (_req, ctx) => Response.json(toJobDto(await findJobOr404(ctx))));

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const input = updateJobSchema.parse(await req.json());
    const job = await findJobOr404(ctx);
    Object.assign(job, input);
    await job.save();
    return Response.json(toJobDto(job));
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);

export const DELETE = withAuth(
  async (_req, ctx) => {
    const job = await findJobOr404(ctx);
    await CandidateModel.deleteMany({ workspaceId: ctx.user.workspaceId, jobId: job._id });
    await job.deleteOne();
    return new Response(null, { status: 204 });
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "jobs-write" } }
);
