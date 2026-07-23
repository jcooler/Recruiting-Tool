import { NextRequest } from "next/server";
import { z } from "zod";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { trimmedString } from "@/lib/schemas/common";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

const renameWorkspaceSchema = z.object({ name: trimmedString(80) }).strict();

export const GET = withAuth(async (_req, ctx) => {
  const workspace = await WorkspaceModel.findById(ctx.user.workspaceId).exec();
  if (!workspace) throw new ApiError(401, "You must be logged in to access this resource");

  return Response.json({
    id: workspace._id.toString(),
    name: workspace.name,
    isDemo: workspace.isDemo,
    ...(workspace.expiresAt ? { expiresAt: workspace.expiresAt.toISOString() } : {}),
  });
});

export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const workspace = await WorkspaceModel.findById(ctx.user.workspaceId).exec();
    if (!workspace) throw new ApiError(401, "You must be logged in to access this resource");

    const { name } = renameWorkspaceSchema.parse(await req.json());
    workspace.name = name;
    await workspace.save();

    return Response.json({ id: workspace._id.toString(), name: workspace.name, isDemo: workspace.isDemo });
  },
  { minRole: "admin", rateLimit: { ...RATE_LIMITS.mutation, scope: "workspace-write" } }
);
