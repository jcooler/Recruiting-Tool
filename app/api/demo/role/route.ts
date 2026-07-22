import { NextRequest } from "next/server";
import UserModel from "@/models/user";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { memberRoleSchema } from "@/lib/schemas/candidate";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const POST = withAuth(
  async (req: NextRequest, ctx) => {
    if (!ctx.user.isDemo) throw new ApiError(403, "Role switching is a demo feature");

    const { role } = memberRoleSchema.parse(await req.json());
    await UserModel.updateOne({ _id: ctx.user.id }, { role });

    return Response.json({ role });
  },
  { rateLimit: { ...RATE_LIMITS.mutation, scope: "demo-role" } }
);
