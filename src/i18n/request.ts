import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

// نعتمد على الكوكيز لاختيار اللغة (دون بادئة في الرابط) لتبسيط RTL/LTR
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale =
    cookieLocale && routing.locales.includes(cookieLocale as "ar" | "en")
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
