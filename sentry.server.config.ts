import * as Sentry from "@sentry/nextjs";

// إن غاب SENTRY_DSN، لا تُهيَّأ Sentry إطلاقاً (لا خطأ، لا تعطيل للتطبيق) -
// هذا يسمح بتشغيل المشروع محلياً/في بيئات تجريبية بلا حساب Sentry.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // نسبة أخذ العينات لتتبّع الأداء (Tracing) - قيمة متحفّظة لتقليل التكلفة
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,

    // فلترة استباقية: لا نُرسل أي شيء قد يحتوي بيانات حساسة (Defense in
    // depth - إضافة على أي إعدادات Scrubbing على لوحة Sentry نفسها)
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }
      }
      return event;
    },
  });
}
