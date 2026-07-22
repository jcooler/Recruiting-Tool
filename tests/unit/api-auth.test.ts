import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { apiReq, makeUser, routeParams } from "../helpers/api";
import { POST as signup } from "@/../app/api/users/signup/route";
import { POST as login } from "@/../app/api/users/login/route";
import { POST as logout } from "@/../app/api/users/logout/route";
import { GET as me } from "@/../app/api/users/me/route";

setupTestDb();
const P = routeParams();

function cookieToken(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.match(/aw_session=([^;]*)/)![1];
}

describe("auth routes", () => {
  it("signup creates workspace + admin user and logs in", async () => {
    const res = await signup(apiReq("POST", "/api/users/signup", { body: { username: "jon", email: "jon@x.com", password: "longenough1" } }), P);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("admin");
    expect(body.workspaceName).toContain("jon");
    const meRes = await me(apiReq("GET", "/api/users/me", { token: cookieToken(res) }), P);
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).username).toBe("jon");
  });

  it("signup 409s on duplicate username", async () => {
    const body = { username: "dup", email: "a@x.com", password: "longenough1" };
    await signup(apiReq("POST", "/api/users/signup", { body }), P);
    const res = await signup(apiReq("POST", "/api/users/signup", { body: { ...body, email: "b@x.com" } }), P);
    expect(res.status).toBe(409);
  });

  it("login succeeds with correct creds, generic 401 otherwise", async () => {
    await signup(apiReq("POST", "/api/users/signup", { body: { username: "kim", email: "kim@x.com", password: "longenough1" } }), P);
    const good = await login(apiReq("POST", "/api/users/login", { body: { username: "kim", password: "longenough1" } }), P);
    expect(good.status).toBe(200);
    const badPw = await login(apiReq("POST", "/api/users/login", { body: { username: "kim", password: "wrong-pass-1" } }), P);
    const badUser = await login(apiReq("POST", "/api/users/login", { body: { username: "ghost", password: "wrong-pass-1" } }), P);
    expect(badPw.status).toBe(401);
    expect(badUser.status).toBe(401);
    expect((await badPw.json()).error).toBe((await badUser.json()).error);
  });

  it("login rejects operator-injection payloads with 400", async () => {
    const res = await login(apiReq("POST", "/api/users/login", { body: { username: { $ne: "" }, password: { $ne: "" } } }), P);
    expect(res.status).toBe(400);
  });

  it("logout revokes the session", async () => {
    const { token } = await makeUser("admin");
    await logout(apiReq("POST", "/api/users/logout", { token }), P);
    const meRes = await me(apiReq("GET", "/api/users/me", { token }), P);
    expect(meRes.status).toBe(401);
  });

  it("signup dedupes email case-insensitively with a 409", async () => {
    await signup(apiReq("POST", "/api/users/signup", { body: { username: "casea", email: "case@x.com", password: "longenough1" } }), P);
    const res = await signup(apiReq("POST", "/api/users/signup", { body: { username: "caseb", email: "CASE@x.com", password: "longenough1" } }), P);
    expect(res.status).toBe(409);
  });

  it("login returns 401 for unknown users (bcrypt path exercised)", async () => {
    const res = await login(apiReq("POST", "/api/users/login", { body: { username: "nobody-here", password: "whatever-123" } }), P);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid credentials");
  });
});
