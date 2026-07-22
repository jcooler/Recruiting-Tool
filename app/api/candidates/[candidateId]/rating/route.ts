import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { ratingSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const candidate = await findCandidateOr404(ctx);
    const input = ratingSchema.parse(await req.json());

    const meta = `${candidate.rating} → ${input.rating}`;
    candidate.rating = input.rating;
    candidate.activity.push(activityEntry(ctx, "rating-changed", meta));
    await candidate.save();
    return Response.json(toCandidateDto(candidate));
  },
  { rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
