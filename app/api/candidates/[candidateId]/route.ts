import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { updateCandidateSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";
const writeGuard = { minRole: "recruiter" as const, rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } };

export const GET = withAuth(async (_req, ctx) => Response.json(toCandidateDto(await findCandidateOr404(ctx))));

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const input = updateCandidateSchema.parse(await req.json());
  const candidate = await findCandidateOr404(ctx);
  Object.assign(candidate, input);
  candidate.activity.push(activityEntry(ctx, "updated", "profile updated"));
  await candidate.save();
  return Response.json(toCandidateDto(candidate));
}, writeGuard);

export const DELETE = withAuth(async (_req, ctx) => {
  const candidate = await findCandidateOr404(ctx);
  await candidate.deleteOne();
  return new Response(null, { status: 204 });
}, writeGuard);
