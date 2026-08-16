import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // اللغات المدعومة
  locales: ["ar", "en"],
  // اللغة الافتراضية: العربية
  defaultLocale: "ar",
  // لا نضيف بادئة اللغة في الرابط للغة الافتراضية،
  // ونعتمد على الكوكيز للتبديل بين RTL/LTR
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
