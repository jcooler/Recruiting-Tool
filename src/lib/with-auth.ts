import { NextRequest } from "next/server";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { ApiError, handleApiError, jsonError } from "./api-error";
import { dbConnect } from "./db";
import { consumeRateLimit, type RateLimitConfig } from "./rate-limit";
import { getUserIdForToken, SESSION_COOKIE } from "./session";
import { roleRank, type Role } from "./types";

export interface AuthCtx {
  user: { id: string; username: string; role: Role; workspaceId: string; isDemo: boolean };
  params: Record<string, string>;
}

type AuthedHandler = (req: NextRequest, ctx: AuthCtx) => Promise<Response>;
type PublicHandler = (req: NextRequest, params: Record<string, string>) => Promise<Response>;
type RouteContext = { params: Promise<Record<string, string>> };
type Guard = { rateLimit?: RateLimitConfig & { scope: string } };

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

async function runGuards(req: NextRequest, opts?: Guard): Promise<Response | null> {
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return jsonError(403, "Cross-origin request rejected");
      } catch {
        return jsonError(403, "Cross-origin request rejected");
      }
    }
  }
  if (opts?.rateLimit) {
    const { scope, limit, windowMs } = opts.rateLimit;
    const result = await consumeRateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
    if (!result.allowed) {
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
      );
    }
  }
  return null;
}

export function withPublic(handler: PublicHandler, opts?: Guard) {
  return async (req: NextRequest, route: RouteContext): Promise<Response> => {
    try {
      const guarded = await runGuards(req, opts);
      if (guarded) return guarded;
      await dbConnect();
      return await handler(req, await route.params);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function withAuth(handler: AuthedHandler, opts?: Guard & { minRole?: Role }) {
  return async (req: NextRequest, route: RouteContext): Promise<Response> => {
    try {
      const guarded = await runGuards(req, opts);
      if (guarded) return guarded;
      await dbConnect();

      const token = req.cookies.get(SESSION_COOKIE)?.value;
      const userId = token ? await getUserIdForToken(token) : null;
      if (!userId) throw new ApiError(401, "You must be logged in to access this resource");

      const user = await UserModel.findById(userId).exec();
      if (!user) throw new ApiError(401, "You must be logged in to access this resource");

      if (opts?.minRole && roleRank[user.role as Role] < roleRank[opts.minRole]) {
        throw new ApiError(403, "Insufficient role for this action");
      }

      const workspace = await WorkspaceModel.findById(user.workspaceId).exec();
      if (!workspace) throw new ApiError(401, "Workspace no longer exists");

      return await handler(req, {
        user: {
          id: user._id.toString(),
          username: user.username,
          role: user.role as Role,
          workspaceId: user.workspaceId.toString(),
          isDemo: workspace.isDemo,
        },
        params: await route.params,
      });
    } catch (err) {
      return handleApiError(err);
    }
  };
}
