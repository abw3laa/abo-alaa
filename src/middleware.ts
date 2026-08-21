import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { authConfig } from "@/lib/auth/config";
import { isStaff } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

// حماية المسارات على مستوى الخادم (لوحة التحكم وحساب العميل) + توليد Nonce
// لكل طلب لسياسة أمان المحتوى (Content-Security-Policy) بدون 'unsafe-inline'
// لسكربتات JS، وهو أقوى بكثير من unsafe-inline ضد XSS.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // === نفس منطق authConfig.callbacks.authorized بالضبط ===
  // نطبّقه هنا يدوياً (بدل الاعتماد على السلوك التلقائي لـauth() المُغلَّف
  // بدالة مخصصة، وهو غير مضمون بنفس درجة الوضوح) لتفادي أي إضعاف عرضي
  // لحماية المسارات أثناء إضافة منطق الـNonce.
  const role = req.auth?.user?.role as UserRole | undefined;
  const isLoggedIn = !!req.auth?.user;
  const path = req.nextUrl.pathname;

  const isAdminArea = path.startsWith("/admin") || path.startsWith("/api/admin");
  const isAccountArea = path.startsWith("/account");

  if (isAdminArea && !(isLoggedIn && !!role && isStaff(role))) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }
  if (isAccountArea && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // === Nonce لكل طلب + رؤوس الأمان ===
  const nonce = randomBytes(16).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // لا 'unsafe-inline' هنا بعد الآن - فقط سكربتات تحمل الـnonce الصحيح
    // (المُنشأ عشوائياً لكل طلب) أو من المصادر الموثوقة صراحةً تُنفَّذ
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://va.vercel-scripts.com`,
    // الأنماط (style): نفصل style-src عن style-src-attr - وهذا تحسين
    // حقيقي وليس شكلياً. style-src (بلا unsafe-inline) يمنع حقن كتلة
    // <style> كاملة أو stylesheet خارجي (وهو السطح الفعلي لهجمات
    // CSS Injection/Exfiltration عبر Attribute Selectors). أما
    // style-src-attr فنُبقيها unsafe-inline لأن التطبيق يحتاج فعلياً
    // سمة style="" على عناصر قليلة لقيم ديناميكية بحتة وقت التشغيل
    // (مثال: لون HEX لمتغيّر منتج قادم من قاعدة البيانات) لا يمكن معرفتها
    // وقت البناء (Build Time) فتتعذّر معها فئات Tailwind الثابتة، ولا
    // تدعم أغلب المتصفحات حالياً Nonce على سمات style (فقط على عناصر
    // <style> الكاملة). النطاق المتبقي مقصور فعلياً على تأثير جمالي محدود
    // (لون/موضع) وليس تنفيذ كود.
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://vitals.vercel-insights.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return response;
});

export const config = {
  // يشمل كل الصفحات ومسارات API فيما عدا الأصول الثابتة (لا فائدة أمنية
  // من CSP على ملفات صور/خطوط ثابتة، وتجنّباً لتكلفة أداء غير ضرورية)
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff2?)$).*)",
  ],
};
