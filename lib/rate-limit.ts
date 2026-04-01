/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with Upstash Redis.
 * This works for single-instance deployments (Netlify, Vercel).
 */

const hits = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60 * 60 * 1000 // 1 hour
): Promise<{ success: boolean; remaining: number }> {
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

// Clean up old entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, 10 * 60 * 1000);
}
