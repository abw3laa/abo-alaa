import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/**
 * نقطة استقبال أحداث مزوّد الدفع (Webhook).
 * - تتحقق من توقيع المزوّد (HMAC + طابع زمني عبر Stripe SDK - يرفض المعاد إرساله
 *   بعد انتهاء الصلاحية تلقائياً).
 * - تمنع التكرار عبر تخزين eventId فريد في قاعدة البيانات (Idempotency).
 * - تحدّث حالة الطلب والدفع فقط بناءً على حدث موقّع من المزوّد.
 * - لا تُسرّب أي تفاصيل داخلية في حال الفشل.
 */
export async function POST(request: Request) {
  try {
    // حماية أساسية ضد فيضان الطلبات من مصدر واحد (المزوّدون الحقيقيون يعيدون
    // المحاولة تلقائياً عند 5xx فلا داعي لحد صارم هنا)
    const clientId = getClientId(request);
    const limit = await rateLimit(`webhook:${clientId}`, 120, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "too many requests" },
        { status: 429 }
      );
    }

    const rawBody = await request.text();
    const signature =
      request.headers.get("stripe-signature") ??
      request.headers.get("x-webhook-signature");

    const provider = getPaymentProvider();
    const result = await provider.verifyWebhook(rawBody, signature);

    if (!result.valid || !result.eventId) {
      return NextResponse.json({ error: "توقيع غير صالح" }, { status: 400 });
    }

    // منع المعالجة المكررة لنفس الحدث (eventId فريد في قاعدة البيانات)
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: result.eventId },
    });
    if (existing?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    let payloadJson: unknown = {};
    try {
      payloadJson = JSON.parse(rawBody || "{}");
    } catch {
      payloadJson = { raw: "unparsable" };
    }

    await prisma.webhookEvent.upsert({
      where: { eventId: result.eventId },
      update: {},
      create: {
        provider: provider.name,
        eventId: result.eventId,
        eventType: result.eventType ?? "unknown",
        payload: payloadJson as never,
      },
    });

    // تحديث الدفع والطلب حسب الحالة - فقط بناءً على بيانات موقّعة من المزوّد
    if (result.providerRef && result.status) {
      const payment = await prisma.payment.findFirst({
        where: { providerRef: result.providerRef },
      });
      if (payment) {
        const paymentStatus =
          result.status === "paid"
            ? "PAID"
            : result.status === "refunded"
              ? "REFUNDED"
              : "FAILED";

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: paymentStatus },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus,
              ...(result.status === "paid" ? { status: "CONFIRMED" } : {}),
            },
          }),
        ]);

        await logAudit({
          action: "payment.webhook_processed",
          entity: "Payment",
          entityId: payment.id,
          metadata: {
            eventId: result.eventId,
            eventType: result.eventType,
            status: result.status,
          },
        });
      }
    }

    await prisma.webhookEvent.update({
      where: { eventId: result.eventId },
      data: { processed: true },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    // لا نُسرّب تفاصيل داخلية (Prisma errors, stack traces) للمُرسل، لكن
    // هذا مسار حرج (فشل هنا قد يعني حالة دفع عالقة) فيجب أن يظهر لمراقبة
    // الخادم فوراً - وليس فقط في سجلات نصية قد لا تُراجَع
    Sentry.captureException(err, { tags: { route: "webhooks/payment" } });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
