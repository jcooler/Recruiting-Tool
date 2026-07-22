import { NextRequest } from "next/server";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import type { Role } from "@/lib/types";

export async function makeUser(role: Role, wsOpts?: { isDemo?: boolean }) {
  const workspace = await WorkspaceModel.create({
    name: "Test WS", isDemo: wsOpts?.isDemo ?? false,
    ...(wsOpts?.isDemo ? { expiresAt: new Date(Date.now() + 86_400_000) } : {}),
  });
  const n = Math.floor(Math.random() * 1e9);
  const user = await UserModel.create({
    username: `user${n}`, email: `user${n}@x.com`,
    passwordHash: await bcrypt.hash("password-123", 4),
    workspaceId: workspace._id, role,
  });
  const { token } = await createSession(user._id.toString());
  return { user, workspace, token };
}

export function apiReq(
  method: string, url: string,
  opts?: { token?: string; body?: unknown; headers?: Record<string, string> }
) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      host: "localhost",
      ...(opts?.body ? { "content-type": "application/json" } : {}),
      ...(opts?.token ? { cookie: `${SESSION_COOKIE}=${opts.token}` } : {}),
      ...opts?.headers,
    },
    ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
  });
}

export function routeParams(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

export const someId = () => new Types.ObjectId().toString();
