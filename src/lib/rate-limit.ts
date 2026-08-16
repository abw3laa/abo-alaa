// ==========================================
// Rate Limiting بسيط في الذاكرة (Sliding Window)
// مناسب للحماية الأساسية. للإنتاج على نطاق واسع
// يُنصح باستخدام Redis (@upstash/ratelimit) عبر REDIS_URL.
// ==========================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// تنظيف دوري للذاكرة
let lastCleanup = Date.now();
function cleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * يتحقق من تجاوز الحد. يرجع { allowed, remaining, resetAt }.
 * @param identifier مفتاح فريد (IP + مسار)
 * @param limit عدد الطلبات المسموح
 * @param windowMs نافذة الوقت بالميلي ثانية
 */
export function rateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(identifier);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/** استخراج معرّف العميل من الطلب */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return ip;
}
