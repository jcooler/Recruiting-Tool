import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError } from "@/lib/api-error";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas/auth";
import { createSession, serializeSessionCookie } from "@/lib/session";
import { withPublic } from "@/lib/with-auth";
import type { UserDto } from "@/lib/dto";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

// Hash of the string "timing-equalizer" at cost 10 - compared against when the
// user does not exist so unknown-user and bad-password paths cost the same.
const DUMMY_HASH = "$2b$10$U3mHy6kJr3Z/U/.NqlDR2e3m7xQC40Vbz/N6xZLmLrunNYsv/dAxe";

export const POST = withPublic(
  async (req: NextRequest) => {
    const { username, password } = loginSchema.parse(await req.json());

    const user = await UserModel.findOne({ username }).select("+passwordHash +email").exec();
    // Generic message either way - do not reveal which part failed (ported behavior).
    // Always call bcrypt.compare to equalize timing for unknown users vs bad passwords.
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      throw new ApiError(401, "Invalid credentials");
    }
    const workspace = await WorkspaceModel.findById(user.workspaceId).exec();
    if (!workspace) throw new ApiError(401, "Invalid credentials");

    const { token, expiresAt } = await createSession(user._id.toString());
    const dto: UserDto = {
      id: user._id.toString(), username: user.username, email: user.email,
      role: user.role as Role, workspaceId: user.workspaceId.toString(),
      isDemo: workspace.isDemo, workspaceName: workspace.name,
      ...(workspace.expiresAt ? { demoExpiresAt: workspace.expiresAt.toISOString() } : {}),
    };
    return Response.json(dto, { status: 200, headers: { "Set-Cookie": serializeSessionCookie(token, expiresAt) } });
  },
  { rateLimit: { ...RATE_LIMITS.auth, scope: "login" } }
);
