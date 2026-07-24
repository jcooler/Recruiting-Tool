import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { signUpSchema } from "@/lib/schemas/auth";
import { createSession, serializeSessionCookie } from "@/lib/session";
import { withPublic } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";

export const runtime = "nodejs";

export const POST = withPublic(
  async (req: NextRequest) => {
    const { username, email, password } = signUpSchema.parse(await req.json());

    if (await UserModel.findOne({ username }).exec()) {
      throw new ApiError(409, "Username already exists. Please choose a different name or log in instead.");
    }
    if (await UserModel.findOne({ email }).select("+email").exec()) {
      throw new ApiError(409, "Email already exists. Please choose a different email or log in instead.");
    }

    const workspace = await WorkspaceModel.create({ name: `${username}'s workspace` });
    let user;
    try {
      user = await UserModel.create({
        username, email,
        passwordHash: await bcrypt.hash(password, 10),
        workspaceId: workspace._id, role: "admin",
      });
    } catch (err) {
      await WorkspaceModel.deleteOne({ _id: workspace._id });
      if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
        throw new ApiError(409, "Email already exists. Please choose a different email or log in instead.");
      }
      throw err;
    }

    const { token, expiresAt } = await createSession(user._id.toString());
    const dto: UserDto = {
      id: user._id.toString(), username, email, role: "admin",
      workspaceId: workspace._id.toString(), isDemo: false, workspaceName: workspace.name,
    };
    return Response.json(dto, { status: 201, headers: { "Set-Cookie": serializeSessionCookie(token, expiresAt) } });
  },
  { rateLimit: { ...RATE_LIMITS.auth, scope: "signup" } }
);
