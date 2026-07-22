import RateLimitModel from "@/models/rate-limit";
import { dbConnect } from "./db";

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  mutation: { limit: 120, windowMs: 60_000 },
  demo: { limit: 5, windowMs: 60 * 60_000 },
  parse: { limit: 20, windowMs: 60_000 },
} as const;

export type RateLimitConfig = { limit: number; windowMs: number };

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await dbConnect();
  const now = new Date();

  // Try to increment an active window atomically.
  const active = await RateLimitModel.findOneAndUpdate(
    { key, windowStart: { $gt: new Date(now.getTime() - windowMs) } },
    { $inc: { count: 1 } },
    { new: true }
  ).exec();

  if (active) {
    if (active.count > limit) {
      const resetAt = active.windowStart.getTime() + windowMs;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  // No active window: start a fresh one (upsert replaces a lapsed doc).
  await RateLimitModel.updateOne(
    { key },
    { $set: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs * 2) } },
    { upsert: true }
  ).exec();
  return { allowed: true, retryAfterSec: 0 };
}
