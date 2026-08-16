import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

/**
 * نقطة استقبال أحداث مزوّد الدفع (Webhook).
 * - تتحقق من توقيع المزوّد.
 * - تمنع التكرار عبر تخزين eventId (Idempotency).
 * - تحدّث حالة الطلب والدفع.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("stripe-signature") ??
    request.headers.get("x-webhook-signature");

  const provider = getPaymentProvider();
  const result = await provider.verifyWebhook(rawBody, signature);

  if (!result.valid || !result.eventId) {
    return NextResponse.json({ error: "توقيع غير صالح" }, { status: 400 });
  }

  // منع المعالجة المكررة لنفس الحدث
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId: result.eventId },
  });
  if (existing?.processed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await prisma.webhookEvent.upsert({
    where: { eventId: result.eventId },
    update: {},
    create: {
      provider: provider.name,
      eventId: result.eventId,
      eventType: result.eventType ?? "unknown",
      payload: JSON.parse(rawBody || "{}"),
    },
  });

  // تحديث الدفع والطلب حسب الحالة
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
    }
  }

  await prisma.webhookEvent.update({
    where: { eventId: result.eventId },
    data: { processed: true },
  });

  return NextResponse.json({ received: true });
}
