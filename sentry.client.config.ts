import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN (وليس SENTRY_DSN) لأن هذا الملف يُحزَّم ويُنفَّذ
// في المتصفح - أي متغيّر يُستخدم هنا يجب أن يبدأ بـNEXT_PUBLIC_ عمداً
// (هذا ليس سراً؛ DSN الخاص بـSentry مصمَّم ليكون علنياً في العميل أصلاً).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // إعادة تشغيل الجلسة عند حدوث خطأ فقط (وليس دائماً) لتقليل التكلفة
    // ولتقليل احتمالية تسجيل بيانات حساسة أُدخلت في نماذج الدفع/الحساب
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration({
        // إخفاء كل النصوص والوسائط افتراضياً - أمان أهم من دقة إعادة
        // التشغيل، خصوصاً في صفحات الدفع/الحساب
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
