/**
 * نقطة تهيئة Sentry لبيئتي الخادم (server) والحافة (edge).
 * تُستدعى تلقائياً من Next.js عند الإقلاع (instrumentation hook) - يجب
 * تفعيل experimental.instrumentationHook إن كانت نسخة Next.js تتطلب ذلك
 * صراحة (Next 15 يُفعّلها افتراضياً).
 *
 * ** لم يُختبر هذا الملف عبر build/run فعلي في بيئة هذا التدقيق (انظر
 * القيد المذكور في SECURITY-HARDENING-REPORT.txt) - راجعه واختبره محلياً
 * قبل الاعتماد عليه. إن غاب SENTRY_DSN، تتجاهل حزمة Sentry التهيئة بصمت
 * ولا تُفشل التطبيق (سلوك موثَّق من مزوّد الحزمة). **
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
