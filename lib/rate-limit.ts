import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { and, gte, eq, sql, count } from "drizzle-orm";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

export async function checkRateLimit(
  key: string,
  limit = MAX_REQUESTS,
  windowMs = WINDOW_MS
): Promise<{ success: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMs);

  try {
    // Cleanup old entries for this key
    await db
      .delete(rateLimits)
      .where(
        and(
          eq(rateLimits.key, key),
          sql`${rateLimits.createdAt} < ${windowStart}`
        )
      );

    // Count attempts in current window
    const result = await db
      .select({ total: count() })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.key, key),
          gte(rateLimits.createdAt, windowStart)
        )
      );

    const current = result[0]?.total ?? 0;

    if (current >= limit) {
      return { success: false, remaining: 0 };
    }

    // Record this attempt
    await db.insert(rateLimits).values({ key });

    return { success: true, remaining: limit - current - 1 };
  } catch (err) {
    // Fail open — better to allow than to crash
    console.error("[RateLimit] Error:", err);
    return { success: true, remaining: 1 };
  }
}
