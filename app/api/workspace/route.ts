import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

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
