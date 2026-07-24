import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import UserModel from "@/models/user";
import WorkspaceModel from "@/models/workspace";
import { GET as getWorkspace, PATCH as patchWorkspace } from "@/../app/api/workspace/route";
import { GET as getMembers } from "@/../app/api/workspace/members/route";
import { PATCH as patchMember } from "@/../app/api/workspace/members/[userId]/route";

setupTestDb();
const P = routeParams();

describe("workspace routes", () => {
  it("GET /api/workspace returns id, name, isDemo (no expiresAt for a non-demo workspace)", async () => {
    const { token, workspace } = await makeUser("admin");
    const res = await getWorkspace(apiReq("GET", "/api/workspace", { token }), P);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: workspace._id.toString(), name: workspace.name, isDemo: false });
  });

  it("GET /api/workspace/members lists members of the caller's workspace", async () => {
    const { token, user, workspace } = await makeUser("admin");
    const second = await UserModel.create({
      username: "second-member", email: "second@x.com", passwordHash: "h",
      workspaceId: workspace._id, role: "interviewer",
    });

    const res = await getMembers(apiReq("GET", "/api/workspace/members", { token }), P);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    const ids = body.map((m: { id: string }) => m.id).sort();
    expect(ids).toEqual([user._id.toString(), second._id.toString()].sort());
  });
});

describe("PATCH /api/workspace/members/[userId]", () => {
  it("admin changes a second member's role in the same workspace", async () => {
    const { token, workspace } = await makeUser("admin");
    const second = await UserModel.create({
      username: "second-member", email: "second@x.com", passwordHash: "h",
      workspaceId: workspace._id, role: "interviewer",
    });

    const res = await patchMember(
      apiReq("PATCH", `/api/workspace/members/${second._id}`, { token, body: { role: "recruiter" } }),
      routeParams({ userId: second._id.toString() })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("recruiter");

    const updated = await UserModel.findById(second._id).exec();
    expect(updated!.role).toBe("recruiter");
  });

  it("non-admin gets 403", async () => {
    const { token, workspace } = await makeUser("recruiter");
    const second = await UserModel.create({
      username: "second-member", email: "second@x.com", passwordHash: "h",
      workspaceId: workspace._id, role: "interviewer",
    });

    const res = await patchMember(
      apiReq("PATCH", `/api/workspace/members/${second._id}`, { token, body: { role: "recruiter" } }),
      routeParams({ userId: second._id.toString() })
    );
    expect(res.status).toBe(403);
  });

  it("changing your own role returns 400", async () => {
    const { token, user } = await makeUser("admin");

    const res = await patchMember(
      apiReq("PATCH", `/api/workspace/members/${user._id}`, { token, body: { role: "recruiter" } }),
      routeParams({ userId: user._id.toString() })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("You cannot change your own role");
  });

  it("a target user in another workspace returns 404", async () => {
    const { token } = await makeUser("admin");
    const { user: otherWorkspaceUser } = await makeUser("interviewer");

    const res = await patchMember(
      apiReq("PATCH", `/api/workspace/members/${otherWorkspaceUser._id}`, { token, body: { role: "recruiter" } }),
      routeParams({ userId: otherWorkspaceUser._id.toString() })
    );
    expect(res.status).toBe(404);
  });

  it("blocks self role change even with uppercase ObjectId casing", async () => {
    const { user, token } = await makeUser("admin");
    const res = await patchMember(
      apiReq("PATCH", `/api/workspace/members/${user._id.toString().toUpperCase()}`, { token, body: { role: "recruiter" } }),
      routeParams({ userId: user._id.toString().toUpperCase() })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("You cannot change your own role");
  });
});

describe("PATCH /api/workspace", () => {
  it("admin renames the workspace: 200 with the new name and it is persisted", async () => {
    const { token, workspace } = await makeUser("admin");

    const res = await patchWorkspace(
      apiReq("PATCH", "/api/workspace", { token, body: { name: "Acme Talent" } }),
      P
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: workspace._id.toString(), name: "Acme Talent", isDemo: false });

    const updated = await WorkspaceModel.findById(workspace._id).exec();
    expect(updated!.name).toBe("Acme Talent");
  });

  it("recruiter gets 403 and the name is unchanged", async () => {
    const { token, workspace } = await makeUser("recruiter");

    const res = await patchWorkspace(
      apiReq("PATCH", "/api/workspace", { token, body: { name: "Acme Talent" } }),
      P
    );
    expect(res.status).toBe(403);

    const unchanged = await WorkspaceModel.findById(workspace._id).exec();
    expect(unchanged!.name).toBe(workspace.name);
  });

  it("rejects an empty name with 400", async () => {
    const { token } = await makeUser("admin");

    const res = await patchWorkspace(apiReq("PATCH", "/api/workspace", { token, body: { name: "  " } }), P);
    expect(res.status).toBe(400);
  });

  it("rejects unknown fields (.strict())", async () => {
    const { token } = await makeUser("admin");

    const res = await patchWorkspace(
      apiReq("PATCH", "/api/workspace", { token, body: { name: "Acme Talent", isDemo: true } }),
      P
    );
    expect(res.status).toBe(400);
  });
});
