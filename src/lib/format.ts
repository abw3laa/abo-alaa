// ==========================================
// تنسيق الأسعار والتواريخ حسب اللغة والعملة
// ==========================================

const CURRENCY_LOCALE: Record<string, string> = {
  TRY: "tr-TR",
  USD: "en-US",
  EUR: "de-DE",
};

/** تنسيق السعر حسب العملة واللغة */
export function formatPrice(
  amount: number | string,
  currency: string = "TRY",
  locale: string = "ar"
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const intlLocale =
    locale === "ar" ? "ar" : (CURRENCY_LOCALE[currency] ?? "en");

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/** تنسيق التاريخ حسب اللغة */
export function formatDate(date: Date | string, locale: string = "ar"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** حساب نسبة الخصم */
export function calcDiscountPercent(
  price: number,
  compareAtPrice: number | null | undefined
): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
