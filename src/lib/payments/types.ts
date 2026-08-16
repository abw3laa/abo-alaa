// ==========================================
// واجهة مزوّد الدفع - قابلة للاستبدال
// يجب ألا تمرّ بيانات البطاقة عبر خادمنا؛ نستخدم
// Tokenization / Hosted Fields لدى المزوّد المعتمد PCI DSS
// ==========================================

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  idempotencyKey: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  provider: string;
  // مرجع العملية لدى المزوّد (Intent/Session)
  providerRef: string;
  // رابط صفحة الدفع المستضافة (Hosted Checkout) إن وُجد
  redirectUrl?: string;
  status: "pending" | "paid" | "failed";
}

export interface RefundInput {
  providerRef: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  status: "refunded" | "failed";
}

export interface WebhookVerifyResult {
  valid: boolean;
  eventId?: string;
  eventType?: string;
  providerRef?: string;
  status?: "paid" | "failed" | "refunded";
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  // التحقق من توقيع الـ webhook ومنع التكرار (Idempotency)
  verifyWebhook(
    rawBody: string,
    signature: string | null
  ): Promise<WebhookVerifyResult>;
}
