import { describe, expect, it } from "vitest";
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
    expect(doc!.tokenHash).not.toBe(token);
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
});
