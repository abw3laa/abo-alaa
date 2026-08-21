import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  WebhookVerifyResult,
} from "./types";

/**
 * مزوّد دفع وهمي للتطوير والاختبار.
 * يحاكي سلوك مزوّد حقيقي دون أي تكامل خارجي.
 * يُستبدل بـ Stripe/PayPal عبر متغيّر البيئة PAYMENT_PROVIDER.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      provider: this.name,
      providerRef: `mock_${input.idempotencyKey}`,
      // في الوضع الوهمي نعتبر الدفع ناجحاً فوراً
      status: "paid",
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      providerRef: input.providerRef,
      status: "refunded",
    };
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | null
  ): Promise<WebhookVerifyResult> {
    // حتى في وضع Mock، إن كان MOCK_WEBHOOK_SECRET مضبوطاً (موصى به دوماً خارج
    // التطوير المحلي) فيجب مطابقته - وإلا يستطيع أي طرف خارجي تزوير "دفعة ناجحة".
    const expectedSecret = process.env.MOCK_WEBHOOK_SECRET;
    if (expectedSecret && signature !== expectedSecret) {
      return { valid: false };
    }
    try {
      const data = JSON.parse(rawBody);
      return {
        valid: true,
        eventId: data.id ?? `mock_evt_${Date.now()}`,
        eventType: data.type ?? "payment.succeeded",
        providerRef: data.providerRef,
        status: data.status ?? "paid",
      };
    } catch {
      return { valid: false };
    }
  }
}
