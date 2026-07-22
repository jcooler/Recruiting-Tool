import { NextRequest } from "next/server";
import { Types } from "mongoose";
import UserModel from "@/models/user";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { memberRoleSchema } from "@/lib/schemas/candidate";
import { objectIdSchema } from "@/lib/schemas/common";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const userId = objectIdSchema.parse(ctx.params.userId);
    if (new Types.ObjectId(userId).equals(ctx.user.id)) throw new ApiError(400, "You cannot change your own role");

    const target = await UserModel.findOne({ _id: userId, workspaceId: ctx.user.workspaceId }).exec();
    if (!target) throw new ApiError(404, "User not found");

    const { role } = memberRoleSchema.parse(await req.json());
    target.role = role;
    await target.save();

    return Response.json({ id: target._id.toString(), username: target.username, role: target.role });
  },
  { minRole: "admin", rateLimit: { ...RATE_LIMITS.mutation, scope: "member-write" } }
);
