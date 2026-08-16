import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  WebhookVerifyResult,
} from "./types";

/**
 * محوّل Stripe (هيكل جاهز للربط).
 * لا يُخزّن أي بيانات بطاقة على خادمنا؛ يعتمد على
 * Stripe Checkout المستضاف (Hosted) + Tokenization.
 *
 * للتفعيل:
 * 1. npm i stripe
 * 2. عيّن STRIPE_SECRET_KEY و STRIPE_WEBHOOK_SECRET في البيئة
 * 3. أزل التعليقات عن كود Stripe أدناه
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  private getSecret(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY غير مضبوط في متغيّرات البيئة");
    }
    return key;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.getSecret();
    void input;
    // مثال الربط الحقيقي (يتطلب حزمة stripe):
    //
    // import Stripe from "stripe";
    // const stripe = new Stripe(this.getSecret());
    // const session = await stripe.checkout.sessions.create(
    //   {
    //     mode: "payment",
    //     line_items: [{
    //       price_data: {
    //         currency: input.currency.toLowerCase(),
    //         product_data: { name: `طلب ${input.orderNumber}` },
    //         unit_amount: Math.round(input.amount * 100),
    //       },
    //       quantity: 1,
    //     }],
    //     success_url: input.returnUrl,
    //     cancel_url: input.returnUrl,
    //     customer_email: input.customerEmail,
    //     metadata: { orderId: input.orderId },
    //   },
    //   { idempotencyKey: input.idempotencyKey }
    // );
    // return {
    //   provider: this.name,
    //   providerRef: session.id,
    //   redirectUrl: session.url ?? undefined,
    //   status: "pending",
    // };

    throw new Error(
      "مزوّد Stripe غير مُفعّل بعد. ثبّت حزمة stripe وأزل التعليقات في stripe-provider.ts"
    );
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    this.getSecret();
    throw new Error("Stripe refund غير مُفعّل بعد");
  }

  async verifyWebhook(
    _rawBody: string,
    _signature: string | null
  ): Promise<WebhookVerifyResult> {
    // مثال:
    // const stripe = new Stripe(this.getSecret());
    // const event = stripe.webhooks.constructEvent(
    //   rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!
    // );
    // ... رسم الحدث إلى WebhookVerifyResult
    return { valid: false };
  }
}
