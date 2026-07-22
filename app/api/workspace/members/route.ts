import UserModel from "@/models/user";
import { withAuth } from "@/lib/with-auth";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const members = await UserModel.find({ workspaceId: ctx.user.workspaceId }).sort({ username: 1 }).exec();
  return Response.json(members.map((m) => ({ id: m._id.toString(), username: m.username, role: m.role })));
});
