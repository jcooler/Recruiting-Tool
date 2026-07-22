import { NextRequest } from "next/server";
import { activityEntry, findCandidateOr404 } from "@/lib/candidate-helpers";
import { toCandidateDto } from "@/lib/dto";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { noteSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    const candidate = await findCandidateOr404(ctx);
    const input = noteSchema.parse(await req.json());

    candidate.notes.push({
      authorId: ctx.user.id,
      authorName: ctx.user.username,
      body: input.body,
      createdAt: new Date(),
    });
    candidate.activity.push(activityEntry(ctx, "note-added", ""));
    await candidate.save();
    return Response.json(toCandidateDto(candidate), { status: 201 });
  },
  { rateLimit: { ...RATE_LIMITS.mutation, scope: "cand-write" } }
);
