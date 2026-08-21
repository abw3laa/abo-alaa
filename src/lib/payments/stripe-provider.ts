import Stripe from "stripe";
import type {
  PaymentProvider,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  WebhookVerifyResult,
} from "./types";

/**
 * محوّل Stripe.
 * لا يُخزّن أي بيانات بطاقة على خادمنا؛ يعتمد على
 * Stripe Checkout المستضاف (Hosted) + Tokenization.
 *
 * يتطلب: STRIPE_SECRET_KEY و STRIPE_WEBHOOK_SECRET في متغيّرات البيئة.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private client: Stripe | null = null;

  private getClient(): Stripe {
    if (this.client) return this.client;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY غير مضبوط في متغيّرات البيئة");
    }
    this.client = new Stripe(key);
    return this.client;
  }

  private getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET غير مضبوط في متغيّرات البيئة");
    }
    return secret;
  }

  async createPayment(
    input: CreatePaymentInput
  ): Promise<CreatePaymentResult> {
    const stripe = this.getClient();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              product_data: { name: `طلب ${input.orderNumber}` },
              unit_amount: Math.round(input.amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: input.returnUrl,
        cancel_url: input.returnUrl,
        customer_email: input.customerEmail,
        metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
        payment_intent_data: {
          metadata: { orderId: input.orderId },
        },
      },
      { idempotencyKey: input.idempotencyKey }
    );

    return {
      provider: this.name,
      providerRef: session.id,
      redirectUrl: session.url ?? undefined,
      status: "pending",
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const stripe = this.getClient();
    try {
      let paymentIntentId = input.providerRef;
      if (paymentIntentId.startsWith("cs_")) {
        const session =
          await stripe.checkout.sessions.retrieve(paymentIntentId);
        if (!session.payment_intent) {
          return { providerRef: input.providerRef, status: "failed" };
        }
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
      }

      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(input.amount * 100),
        reason: "requested_by_customer",
      });
      return { providerRef: input.providerRef, status: "refunded" };
    } catch {
      return { providerRef: input.providerRef, status: "failed" };
    }
  }

  async verifyWebhook(
    rawBody: string,
    signature: string | null
  ): Promise<WebhookVerifyResult> {
    if (!signature) return { valid: false };

    const stripe = this.getClient();
    let event: Stripe.Event;
    try {
      // constructEvent يتحقق من التوقيع HMAC والطابع الزمني معاً، ويرفض أي
      // حمولة معدَّلة أو منتهية الصلاحية.
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.getWebhookSecret()
      );
    } catch {
      return { valid: false };
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          valid: true,
          eventId: event.id,
          eventType: event.type,
          providerRef: session.id,
          status: session.payment_status === "paid" ? "paid" : "failed",
        };
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          valid: true,
          eventId: event.id,
          eventType: event.type,
          providerRef: session.id,
          status: "failed",
        };
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? charge.id);
        return {
          valid: true,
          eventId: event.id,
          eventType: event.type,
          providerRef: paymentIntentId,
          status: "refunded",
        };
      }
      default:
        return { valid: true, eventId: event.id, eventType: event.type };
    }
  }
}
