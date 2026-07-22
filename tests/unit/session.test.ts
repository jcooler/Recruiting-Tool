import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { setupTestDb } from "../helpers/db";
import SessionModel from "@/models/session";
import { createSession, destroySession, getUserIdForToken, serializeSessionCookie } from "@/lib/session";

setupTestDb();

describe("sessions", () => {
  const userId = new Types.ObjectId().toString();

  it("round-trips a session and stores only a hash", async () => {
    const { token } = await createSession(userId);
    expect(await getUserIdForToken(token)).toBe(userId);
    const doc = await SessionModel.findOne().exec();
    const expectedHash = createHash("sha256").update(token).digest("hex");
    expect(doc!.tokenHash).toBe(expectedHash);
  });

  it("returns null for unknown or expired tokens", async () => {
    expect(await getUserIdForToken("nope")).toBeNull();
    const { token } = await createSession(userId);
    await SessionModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(await getUserIdForToken(token)).toBeNull();
  });

  it("destroySession revokes server-side", async () => {
    const { token } = await createSession(userId);
    await destroySession(token);
    expect(await getUserIdForToken(token)).toBeNull();
  });

  it("cookie flags are correct", async () => {
    const cookie = serializeSessionCookie("tok", new Date(Date.now() + 1000));
    expect(cookie).toContain("aw_session=tok");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("rolling extension clamps at the absolute cap", async () => {
    const { token } = await createSession(userId, { absoluteMs: 30 * 60 * 1000 }); // 30 min absolute
    expect(await getUserIdForToken(token)).toBe(userId);
    const doc = await SessionModel.findOne().exec();
    // idle would be now+1h, but must clamp to the 30-min absolute cap
    expect(doc!.expiresAt.getTime()).toBe(doc!.absoluteExpiresAt.getTime());
  });

  it("adds Secure only in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(serializeSessionCookie("t", new Date())).toContain("; Secure");
    vi.stubEnv("NODE_ENV", "test");
    expect(serializeSessionCookie("t", new Date())).not.toContain("Secure");
  });

  it("createSession returns the absolute cap for the cookie lifetime", async () => {
    const { token, expiresAt } = await createSession(userId);
    void token;
    const doc = await SessionModel.findOne().sort({ _id: -1 }).exec();
    expect(expiresAt.getTime()).toBe(doc!.absoluteExpiresAt.getTime());
  });
});
