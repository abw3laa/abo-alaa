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
