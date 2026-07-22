import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import WorkspaceModel from "@/models/workspace";
import UserModel from "@/models/user";
import SessionModel from "@/models/session";
import CandidateModel from "@/models/candidate";
import { GET as me } from "@/../app/api/users/me/route";
import { POST as demoStart } from "@/../app/api/demo/start/route";
import { POST as demoRole } from "@/../app/api/demo/role/route";

setupTestDb();
const P = routeParams();

function cookieToken(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.match(/aw_session=([^;]*)/)![1];
}

describe("demo routes", () => {
  it("demo/start authenticates a demo admin with 60 seeded candidates", async () => {
    const startRes = await demoStart(apiReq("POST", "/api/demo/start"), P);
    expect(startRes.status).toBe(200);
    expect(await startRes.json()).toEqual({ ok: true });

    const token = cookieToken(startRes);
    const meRes = await me(apiReq("GET", "/api/users/me", { token }), P);
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.role).toBe("admin");
    expect(meBody.isDemo).toBe(true);

    const candidateCount = await CandidateModel.countDocuments({ workspaceId: meBody.workspaceId });
    expect(candidateCount).toBe(60);
  });

  it("expiring the demo workspace then starting a new demo sweeps the old workspace, candidates, users, and sessions", async () => {
    const firstStart = await demoStart(apiReq("POST", "/api/demo/start"), P);
    const firstToken = cookieToken(firstStart);
    const firstMe = await me(apiReq("GET", "/api/users/me", { token: firstToken }), P);
    const firstBody = await firstMe.json();
    const oldWorkspaceId = firstBody.workspaceId;
    const oldUserId = firstBody.id;

    await WorkspaceModel.updateOne({ _id: oldWorkspaceId }, { expiresAt: new Date(Date.now() - 1000) });

    const secondStart = await demoStart(apiReq("POST", "/api/demo/start"), P);
    expect(secondStart.status).toBe(200);

    expect(await WorkspaceModel.findById(oldWorkspaceId).exec()).toBeNull();
    expect(await CandidateModel.countDocuments({ workspaceId: oldWorkspaceId })).toBe(0);
    expect(await UserModel.countDocuments({ workspaceId: oldWorkspaceId })).toBe(0);
    expect(await SessionModel.countDocuments({ userId: oldUserId })).toBe(0);
  });

  it("demo/role flips the caller's own role and 403s for a non-demo user", async () => {
    const startRes = await demoStart(apiReq("POST", "/api/demo/start"), P);
    const token = cookieToken(startRes);

    const roleRes = await demoRole(apiReq("POST", "/api/demo/role", { token, body: { role: "interviewer" } }), P);
    expect(roleRes.status).toBe(200);
    expect(await roleRes.json()).toEqual({ role: "interviewer" });

    const meRes = await me(apiReq("GET", "/api/users/me", { token }), P);
    expect((await meRes.json()).role).toBe("interviewer");

    const { token: regularToken } = await makeUser("admin");
    const forbidden = await demoRole(
      apiReq("POST", "/api/demo/role", { token: regularToken, body: { role: "interviewer" } }),
      P
    );
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error).toBe("Role switching is a demo feature");
  });

  it("demo user password is a bcrypt cost-10 hash, and two demo starts never reuse it", async () => {
    await demoStart(apiReq("POST", "/api/demo/start"), P);
    await demoStart(apiReq("POST", "/api/demo/start"), P);
    const users = await UserModel.find({ username: { $regex: /^demo-/ } }).select("+passwordHash").exec();
    expect(users.length).toBe(2);
    expect(users[0].passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(users[1].passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(users[0].passwordHash).not.toBe(users[1].passwordHash);
  });
});
