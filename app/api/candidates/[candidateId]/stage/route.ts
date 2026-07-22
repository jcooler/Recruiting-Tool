import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { stageMoveSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const candidate = await findCandidateOr404(ctx);
    const input = stageMoveSchema.parse(await req.json());

    if (input.stage !== undefined) {
      if (input.stage !== candidate.stage) {
        const meta = `${candidate.stage} → ${input.stage}`;
        candidate.stage = input.stage;
        candidate.rejected = false;
        candidate.stageHistory.push({ stage: input.stage, enteredAt: new Date() });
        candidate.activity.push(activityEntry(ctx, "stage-moved", meta));
      }
    } else {
      candidate.rejected = input.rejected!;
      candidate.activity.push(activityEntry(ctx, "stage-moved", input.rejected ? "rejected" : "restored"));
    }
    await candidate.save();
    return Response.json(toCandidateDto(candidate));
  },
  { minRole: "recruiter", rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
