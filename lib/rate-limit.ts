/**
 * Rate limiting with Upstash Redis (production) or in-memory fallback (dev).
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for persistent limiting.
 */

const hasUpstash =
  typeof process !== "undefined" &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN;

// ── Upstash Redis rate limiter (production) ──────────────────────────

async function upstashLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
    analytics: false,
    prefix: "labelos",
  });

  const result = await ratelimit.limit(key);
  return { success: result.success, remaining: result.remaining };
}

// ── In-memory fallback (dev / single-instance) ──────────────────────

const hits = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// Cleanup old entries
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, 10 * 60 * 1000);
}

// ── Public API ───────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60 * 60 * 1000
): Promise<{ success: boolean; remaining: number }> {
  if (hasUpstash) {
    try {
      return await upstashLimit(key, limit, windowMs);
    } catch (err) {
      console.error("[RateLimit] Upstash failed, using fallback:", err);
      return memoryLimit(key, limit, windowMs);
    }
  }
  return memoryLimit(key, limit, windowMs);
}
