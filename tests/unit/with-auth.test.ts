import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "../helpers/db";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { withAuth, withPublic } from "@/lib/with-auth";

setupTestDb();

async function makeUser(role: "admin" | "recruiter" | "interviewer") {
  const ws = await WorkspaceModel.create({ name: "W" });
  const user = await UserModel.create({
    username: `u-${role}-${Math.floor(Math.random() * 1e9)}`,
    email: `${role}-${Math.floor(Math.random() * 1e9)}@x.com`,
    passwordHash: "h", workspaceId: ws._id, role,
  });
  const { token } = await createSession(user._id.toString());
  return { user, token };
}

function req(method: string, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}), host: "localhost", ...headers },
  });
}
const route = { params: Promise.resolve({}) };

describe("withAuth", () => {
  const ok = withAuth(async () => Response.json({ ok: true }));

  it("401s without a session", async () => {
    expect((await ok(req("GET"), route)).status).toBe(401);
  });

  it("passes ctx.user for a valid session", async () => {
    const { user, token } = await makeUser("recruiter");
    const handler = withAuth(async (_req, ctx) => Response.json(ctx.user));
    const res = await handler(req("GET", token), route);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(user._id.toString());
    expect(body.workspaceId).toBe(user.workspaceId.toString());
    expect(body.role).toBe("recruiter");
  });

  it("enforces minRole (interviewer blocked from recruiter route)", async () => {
    const { token } = await makeUser("interviewer");
    const guarded = withAuth(async () => Response.json({ ok: true }), { minRole: "recruiter" });
    expect((await guarded(req("POST", token), route)).status).toBe(403);
  });

  it("admin passes recruiter gate", async () => {
    const { token } = await makeUser("admin");
    const guarded = withAuth(async () => Response.json({ ok: true }), { minRole: "recruiter" });
    expect((await guarded(req("POST", token), route)).status).toBe(200);
  });

  it("rejects cross-origin mutations", async () => {
    const { token } = await makeUser("admin");
    const res = await ok(req("POST", token, { origin: "https://evil.example" }), route);
    expect(res.status).toBe(403);
  });

  it("allows same-origin mutations", async () => {
    const { token } = await makeUser("admin");
    const res = await ok(req("POST", token, { origin: "http://localhost" }), route);
    expect(res.status).toBe(200);
  });

  it("rate limits withPublic", async () => {
    const open = withPublic(async () => Response.json({ ok: true }), {
      rateLimit: { limit: 2, windowMs: 60_000, scope: "t" },
    });
    await open(req("POST", undefined, { origin: "http://localhost" }), route);
    await open(req("POST", undefined, { origin: "http://localhost" }), route);
    const res = await open(req("POST", undefined, { origin: "http://localhost" }), route);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
