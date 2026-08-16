"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LocaleToggle() {
  const router = useRouter();
  const locale = useLocale();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    // حفظ اللغة في الكوكيز ثم إعادة التحميل لتطبيق RTL/LTR
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="flex size-11 items-center justify-center rounded-md hover:bg-accent"
      aria-label="تبديل اللغة"
    >
      <Globe className="size-5" />
      <span className="sr-only">{locale === "ar" ? "EN" : "ع"}</span>
    </button>
  );
}
