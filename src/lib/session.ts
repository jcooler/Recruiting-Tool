import { createHash, randomBytes } from "crypto";
import SessionModel from "@/models/session";
import { dbConnect } from "./db";

export const SESSION_COOKIE = "aw_session";
const IDLE_MS = 60 * 60 * 1000; // 1h rolling, matches old express-session config
const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, opts?: { absoluteMs?: number }) {
  await dbConnect();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const absolute = new Date(now + (opts?.absoluteMs ?? ABSOLUTE_MS));
  const expiresAt = new Date(Math.min(now + IDLE_MS, absolute.getTime()));
  await SessionModel.create({ tokenHash: hash(token), userId, expiresAt, absoluteExpiresAt: absolute });
  return { token, expiresAt: absolute };
}

export async function getUserIdForToken(token: string): Promise<string | null> {
  await dbConnect();
  const now = new Date();
  const doc = await SessionModel.findOne({ tokenHash: hash(token), expiresAt: { $gt: now } }).exec();
  if (!doc) return null;
  const newExpiry = new Date(Math.min(now.getTime() + IDLE_MS, doc.absoluteExpiresAt.getTime()));
  await SessionModel.updateOne({ _id: doc._id }, { expiresAt: newExpiry });
  return doc.userId.toString();
}

export async function destroySession(token: string): Promise<void> {
  await dbConnect();
  await SessionModel.deleteOne({ tokenHash: hash(token) });
}

function cookieBase(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function serializeSessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; ${cookieBase()}; Expires=${expiresAt.toUTCString()}`;
}

export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieBase()}; Expires=${new Date(0).toUTCString()}`;
}
