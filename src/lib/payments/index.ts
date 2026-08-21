import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock-provider";
import { StripePaymentProvider } from "./stripe-provider";

let instance: PaymentProvider | null = null;

/**
 * مصنع مزوّد الدفع - يختار المزوّد حسب متغيّر البيئة.
 * PAYMENT_PROVIDER = mock | stripe
 */
export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance;

  const provider = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();

  // لا يجوز أبداً قبول دفعات "وهمية" حقيقية في بيئة إنتاج حقيقية بالخطأ.
  // ALLOW_MOCK_PAYMENTS=true هو تجاوز واعٍ صريح (مثلاً بيئة Staging عامة).
  if (
    provider === "mock" &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    throw new Error(
      "PAYMENT_PROVIDER=mock ممنوع في بيئة الإنتاج (NODE_ENV=production). " +
        "اضبط PAYMENT_PROVIDER=stripe مع مفاتيح Stripe حقيقية، أو اضبط " +
        "ALLOW_MOCK_PAYMENTS=true فقط إذا كنت متأكداً أن هذا المتجر لا يقبل " +
        "مدفوعات حقيقية (مثال: بيئة تجريبية/عرض)."
    );
  }

  switch (provider) {
    case "stripe":
      instance = new StripePaymentProvider();
      break;
    case "mock":
    default:
      instance = new MockPaymentProvider();
      break;
  }
  return instance;
}

export type { PaymentProvider } from "./types";
