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
  const windowFloor = new Date(now.getTime() - windowMs);

  // Single atomic increment via an aggregation-pipeline update + upsert:
  // no separate check-then-write, so there's no gap for a second instance
  // to race the window-boundary decision or the first-ever insert.
  const attempt = () =>
    RateLimitModel.findOneAndUpdate(
      { key },
      [
        {
          $set: {
            count: {
              $cond: [{ $gt: ["$windowStart", windowFloor] }, { $add: ["$count", 1] }, 1],
            },
            expiresAt: {
              $cond: [
                { $gt: ["$windowStart", windowFloor] },
                "$expiresAt",
                new Date(now.getTime() + windowMs * 2),
              ],
            },
            windowStart: {
              $cond: [{ $gt: ["$windowStart", windowFloor] }, "$windowStart", now],
            },
          },
        },
      ],
      { new: true, upsert: true }
    ).exec();

  let doc;
  try {
    doc = await attempt();
  } catch (err) {
    // Two first-ever writers can race the upsert insert on the unique key
    // index; the loser gets E11000 and retries onto the now-existing doc.
    if (err instanceof Error && "code" in err && (err as { code?: number }).code === 11000) {
      doc = await attempt();
    } else {
      throw err;
    }
  }

  if (doc.count > limit) {
    const resetAt = doc.windowStart.getTime() + windowMs;
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
  }
  return { allowed: true, retryAfterSec: 0 };
}
