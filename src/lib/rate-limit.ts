// ==========================================
// Rate Limiting موزّع (Redis) مع خطة بديلة في الذاكرة للتطوير المحلي فقط.
//
// لماذا Redis؟ التطبيق يعمل على Vercel (Serverless/Edge) حيث كل Instance
// له ذاكرة منفصلة - عدّاد In-Memory لا يمنع تجاوز الحد فعلياً لأن المهاجم
// يوزَّع تلقائياً عبر عدة Instances. Redis يوفّر عدّاداً ذرّياً (Atomic)
// ومشتركاً بين كل الـInstances مع انتهاء صلاحية تلقائي (TTL).
// ==========================================
import Redis from "ioredis";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ---------- خطة بديلة في الذاكرة (Fallback فقط) ----------
// تُستخدم فقط إن لم يكن REDIS_URL مضبوطاً (تطوير محلي) أو تعذّر الاتصال
// بـRedis مؤقتاً. غير كافية للإنتاج بمفردها عبر أكثر من Instance واحد.
const memoryBuckets = new Map<string, Bucket>();
let lastCleanup = Date.now();
function memoryCleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt < now) memoryBuckets.delete(key);
  }
}

function memoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  memoryCleanup(now);

  const bucket = memoryBuckets.get(identifier);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(identifier, { count: 1, resetAt });
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

// ---------- Redis (Production) ----------
let redisClient: Redis | null = null;
let redisWarned = false;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production" && !redisWarned) {
      redisWarned = true;
      console.error(
        "[rate-limit] REDIS_URL غير مضبوط في بيئة إنتاج. الرجوع مؤقتاً إلى " +
          "Rate Limiting في الذاكرة، وهو غير موثوق عبر أكثر من Instance واحد " +
          "(Serverless). اضبط REDIS_URL فوراً."
      );
    }
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      // لا نطيل الانتظار أبداً على حساب زمن استجابة الطلب الأساسي
      connectTimeout: 1500,
      lazyConnect: true,
    });
    redisClient.on("error", (err) => {
      console.error("[rate-limit] Redis connection error", err.message);
    });
  }
  return redisClient;
}

// Lua script: INCR + PEXPIRE ذرّي بالكامل (لا يوجد سباق بين القراءة والكتابة
// حتى تحت آلاف الطلبات المتزامنة على نفس المفتاح)
const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

async function redisRateLimit(
  redis: Redis,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const [count, ttl] = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    windowMs.toString()
  )) as [number, number];

  const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: Math.max(0, limit - count), resetAt };
}

/**
 * يتحقق من تجاوز الحد بشكل موزّع وذرّي (Redis) مع خطة بديلة في الذاكرة.
 * @param identifier مفتاح فريد (مثال: `login:${email}:${ip}` أو `orders:${ip}`)
 * @param limit عدد الطلبات المسموح ضمن النافذة
 * @param windowMs طول النافذة الزمنية بالميلي ثانية
 */
export async function rateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return memoryRateLimit(identifier, limit, windowMs);
  }
  try {
    return await redisRateLimit(redis, identifier, limit, windowMs);
  } catch (err) {
    // فشل Redis مؤقتاً (شبكة/انقطاع) - لا نُسقط الطلب بالكامل، نرجع للذاكرة
    // كخطة طوارئ قصيرة الأمد فقط، ونسجّل الخطأ لمتابعته.
    console.error("[rate-limit] Redis unavailable, falling back to memory", {
      error: err instanceof Error ? err.message : String(err),
    });
    return memoryRateLimit(identifier, limit, windowMs);
  }
}

/**
 * استخراج معرّف IP للعميل من الطلب.
 *
 * الثقة بـx-forwarded-for بشكل أعمى تسمح لأي عميل بتزوير IP وتجاوز
 * Rate Limiting (يكفي إرسال Header مختلف في كل طلب). المشروع يُنشر على
 * Vercel (انظر vercel.json)، وVercel *يستبدل* x-forwarded-for على حافة
 * شبكته بعنوان الاتصال الحقيقي قبل وصوله لدالة الخادم - أي أن العميل لا
 * يستطيع حقن قيمة زائفة تتجاوز ما وضعته Vercel (يُنسَّق ك"عميل, وسيط1,
 * وسيط2..." حيث أول قيمة هي الأقرب لحافة شبكة Vercel).
 *
 * إن تغيّرت منصة الاستضافة مستقبلاً (خلف Nginx/Cloudflare مباشرة بدون
 * Vercel)، يجب مراجعة هذه الدالة والاعتماد على الهيدر الموثوق لتلك المنصة
 * تحديداً (مثال: CF-Connecting-IP مع Cloudflare) بدل x-forwarded-for العام.
 */
export function getClientId(request: Request): string {
  return extractIp(request.headers.get("x-forwarded-for")) ?? "unknown";
}

/** نفس منطق التحقق، لكن لاستخدامه مع next/headers() (خارج سياق Request مباشر) */
export function getClientIpFromHeaderValue(
  forwardedFor: string | null
): string | null {
  return extractIp(forwardedFor);
}

function extractIp(forwardedFor: string | null): string | null {
  const ip = forwardedFor?.split(",")[0]?.trim();
  const isPlausibleIp =
    !!ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) && ip.length <= 45;
  return isPlausibleIp ? ip : null;
}
