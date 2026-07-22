import { HydratedDocument } from "mongoose";
import CandidateModel, { type Candidate, ACTIVITY_TYPES } from "@/models/candidate";
import { ApiError } from "./api-error";
import { objectIdSchema } from "./schemas/common";
import type { AuthCtx } from "./with-auth";

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findCandidateOr404(ctx: AuthCtx, paramName = "candidateId"): Promise<HydratedDocument<Candidate>> {
  const id = objectIdSchema.parse(ctx.params[paramName]);
  const candidate = await CandidateModel.findOne({ _id: id, workspaceId: ctx.user.workspaceId }).exec();
  if (!candidate) throw new ApiError(404, "Candidate not found");
  return candidate;
}

export function activityEntry(ctx: AuthCtx, type: ActivityType, meta: string) {
  return { type, actorId: ctx.user.id, actorName: ctx.user.username, meta, createdAt: new Date() };
}
