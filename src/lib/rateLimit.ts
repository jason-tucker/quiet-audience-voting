// Simple in-memory token-bucket rate limiter. Survives HMR via globalThis.
// Single-process only — appropriate for this app's deployment model
// (one Node container per host). Multi-process deployments would need a
// shared store (Redis, DB row).

interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as {
  __qavRateLimitBuckets?: Map<string, Bucket>;
};
if (!g.__qavRateLimitBuckets) g.__qavRateLimitBuckets = new Map();
const buckets = g.__qavRateLimitBuckets;

const MAX_BUCKETS = 10000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup so a flood of unique keys can't grow the map without bound.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets.entries()) {
      if (b.resetAt < now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (bucket.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count++;
  return { ok: true, retryAfterSec: 0 };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
