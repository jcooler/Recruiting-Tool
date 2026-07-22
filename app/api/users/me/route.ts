import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { withAuth } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const user = await UserModel.findById(ctx.user.id).select("+email").exec();
  const workspace = await WorkspaceModel.findById(ctx.user.workspaceId).exec();
  if (!user || !workspace) throw new ApiError(401, "You must be logged in to access this resource");
  const dto: UserDto = {
    id: ctx.user.id, username: user.username, email: user.email,
    role: ctx.user.role, workspaceId: ctx.user.workspaceId,
    isDemo: workspace.isDemo, workspaceName: workspace.name,
    ...(workspace.expiresAt ? { demoExpiresAt: workspace.expiresAt.toISOString() } : {}),
  };
  return Response.json(dto);
});
