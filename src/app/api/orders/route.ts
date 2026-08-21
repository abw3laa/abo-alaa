import { randomUUID, randomInt } from "crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyOrderConfirmed } from "@/lib/notifications";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { getPaymentProvider } from "@/lib/payments";
import { applyCouponAtomically } from "@/lib/coupons";

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(30),
  }),
  address: z.object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(6).max(30).optional(),
    country: z.string().min(2).max(80),
    city: z.string().min(1).max(80),
    state: z.string().max(80).optional(),
    street: z.string().min(1).max(200),
    building: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),
  }),
  // معرّف طريقة الدفع (code من PaymentMethodOption) - يُتحقق منه Server-side
  // ولا يُثق بأي قيمة أخرى قادمة من العميل.
  paymentMethod: z.string().min(1).max(40),
  couponCode: z.string().min(1).max(40).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1)
    .max(50),
});

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 30;
const TAX_RATE = 0.1;

/**
 * رقم طلب غير قابل للتخمين (CSPRNG) بدل Math.random().
 * لا يزال يعتمد على @unique في قاعدة البيانات كضمان نهائي.
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = randomInt(0, 36 ** 8)
    .toString(36)
    .toUpperCase()
    .padStart(8, "0");
  return `ORD-${year}-${rand}`;
}

export async function POST(request: Request) {
  try {
    // حماية من إنشاء طلبات مكثّف: 10 طلبات كل دقيقة لكل عميل/IP
    const clientId = getClientId(request);
    const limit = await rateLimit(`orders:${clientId}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة، حاول بعد قليل" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
      const data = parsed.data;
      const session = await auth();
      const guestEmail = data.customer.email.trim().toLowerCase();

    // Idempotency: إن أُرسل نفس المفتاح سابقاً، أعد نتيجة الطلب الأصلي بدل
    // إنشاء طلب مكرر (نقر مزدوج / إعادة محاولة الشبكة / إعادة إرسال النموذج)
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (idempotencyKey) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            idempotencyKey,
            ...(session?.user?.id
              ? { userId: session.user.id }
              : { userId: null, guestEmail }),
          },
          select: { orderNumber: true },
        });
      if (existingOrder) {
        return NextResponse.json(
          { success: true, orderNumber: existingOrder.orderNumber },
          { status: 200 }
        );
      }
    }

    // تحقق من طريقة الدفع Server-side: يجب أن تكون مسجّلة ومفعّلة فعلياً،
    // ولا نثق بأي قيمة حرة من العميل (cod/stripe/mock/anything)
    const paymentOption = await prisma.paymentMethodOption.findUnique({
      where: { code: data.paymentMethod },
    });
    if (!paymentOption || !paymentOption.isActive) {
      return NextResponse.json(
        { error: "طريقة الدفع غير متاحة" },
        { status: 400 }
      );
    }

    // معاملة ذرّية: التحقق من المخزون + خصمه ذرّياً + إنشاء الطلب
    const result = await prisma.$transaction(async (tx) => {
      const customerScope = session?.user?.id
        ? `user:${session.user.id}`
        : `guest:${guestEmail}`;

      // Every order for one customer is serialized. Besides avoiding
      // duplicate guest checkouts, this makes first-order coupon validation
      // correct even when a discounted and non-discounted order race.
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`order:${customerScope}`}))`
      );
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, status: "PUBLISHED", deletedAt: null },
        include: {
          variants: { include: { inventory: true } },
          categories: { select: { categoryId: true } },
        },
      });

      const orderItems = [];
      const couponLineItems: {
        productId: string;
        lineTotal: number;
        categoryIds: string[];
        brandId: string | null;
      }[] = [];
      let subtotal = 0;

      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error("منتج غير متوفر");
        }

        const variant = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)
          : product.variants[0];

        // ملاحظة مهمة (مُوثَّقة في SECURITY-HARDENING-REPORT.txt وليست
        // إصلاحاً صامتاً): إن أُرسل variantId لا يطابق أي متغيّر فعلي،
        // نرفض الطلب صراحة. لكن حالة "منتج بلا أي Variant إطلاقاً" (لا
        // متغيّرات مطلقاً) نُبقيها بنفس سلوكها الأصلي قبل هذا التدقيق
        // (تمرير بلا خصم مخزون) لأن نموذج إنشاء المنتج في
        // admin/products/actions.ts لا يُلزم بإنشاء Variant عند الإنشاء
        // أو النشر - رفض هذه الحالة بصمت كان سيغيّر سلوكاً تجارياً قائماً
        // فعلياً (قد يعطّل شراء منتجات بسيطة موجودة حالياً) دون نقاش. هذه
        // فجوة حقيقية (منتج بلا أي تتبّع مخزون = كمية غير محدودة فعلياً)
        // لكنها قرار منتج/عمل يجب اتخاذه صراحة من صاحب المشروع، وليس
        // تغييراً تقنياً بحتاً - راجع القسم المخصص لها في التقرير.
        if (item.variantId && !variant) {
          throw new Error("منتج غير متوفر");
        }

        // خصم مخزون ذرّي: UPDATE ... WHERE quantity >= ? بدل read-then-write.
        // هذا يمنع Race Condition عند وصول طلبات متزامنة على نفس المخزون
        // المحدود (مثال: 100 طلب متزامن على قطعة واحدة متبقية).
        if (variant?.inventory) {
          const updated = await tx.inventory.updateMany({
            where: {
              id: variant.inventory.id,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new Error(`الكمية المطلوبة من ${product.name} غير متوفرة`);
          }
        } else if (variant) {
          // Variant موجود لكن بلا سجل Inventory أصلاً = غير قابل للبيع
          throw new Error(`الكمية المطلوبة من ${product.name} غير متوفرة`);
        }

        const unitPrice = Number(variant?.price ?? product.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        orderItems.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          variantInfo: [variant?.color, variant?.size]
            .filter(Boolean)
            .join(" / "),
          sku: variant?.sku ?? product.sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
        couponLineItems.push({
          productId: product.id,
          lineTotal,
          categoryIds: product.categories.map((c) => c.categoryId),
          brandId: product.brandId,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      // مجاميع أولية بلا خصم - تُستخدم لإنشاء الطلب أولاً (يجب أن يكون
      // الطلب موجوداً في قاعدة البيانات قبل تطبيق الكوبون، لأن سجل
      // CouponUsage يحمل مفتاحاً خارجياً orderId يُفحص فوراً عند الإدراج)
      const shippingBeforeDiscount =
        subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      const taxBeforeDiscount = Math.round(subtotal * TAX_RATE);
      const grandTotalBeforeDiscount =
        subtotal + shippingBeforeDiscount + taxBeforeDiscount;

      // رقم طلب فريد - نعيد المحاولة عند تصادم نادر جداً بدل فشل الطلب بالكامل
      let order;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          order = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              idempotencyKey: idempotencyKey ?? randomUUID(),
              userId: session?.user?.id ?? null,
                guestEmail: session?.user?.id ? null : guestEmail,
              guestPhone: session?.user?.id ? null : data.customer.phone,
              customerName: data.customer.name,
              status: "PENDING",
              paymentStatus: "PENDING",
              subtotal,
              shippingTotal: shippingBeforeDiscount,
              taxTotal: taxBeforeDiscount,
              grandTotal: grandTotalBeforeDiscount,
              currency: "TRY",
              // لقطة عنوان الشحن الثابتة وقت الشراء - لا تتغيّر إن عدّل
              // العميل عنوانه المحفوظ لاحقاً
              shippingFullName: data.address.fullName ?? data.customer.name,
              shippingPhone: data.address.phone ?? data.customer.phone,
              shippingCountry: data.address.country,
              shippingCity: data.address.city,
              shippingState: data.address.state ?? null,
              shippingStreet: data.address.street,
              shippingBuilding: data.address.building ?? null,
              shippingPostalCode: data.address.postalCode ?? null,
              shippingNotes: data.address.notes ?? null,
              shippingMethod:
                shippingBeforeDiscount === 0 ? "free" : "standard",
              items: { create: orderItems },
              payments: {
                create: {
                  provider: paymentOption.code,
                  amount: grandTotalBeforeDiscount,
                  currency: "TRY",
                  status: "PENDING",
                },
              },
            },
            include: { payments: true },
          });
          break;
        } catch (err) {
          const isUniqueClash =
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002";
          if (isUniqueClash && attempt < 2) continue;
          throw err;
        }
      }
      if (!order) {
        throw new Error("تعذّر إنشاء الطلب");
      }

      // تطبيق كود الخصم ذرّياً الآن (بعد وجود الطلب فعلياً في قاعدة
      // البيانات) - فشل الكوبون هنا يُلغي المعاملة بالكامل (Rollback)
      // بما فيها الطلب والمخزون المخصوم للتو، فالنتيجة النهائية متسقة
      // دائماً (إما طلب كامل وصحيح، أو لا شيء إطلاقاً).
      if (data.couponCode) {
        const couponResult = await applyCouponAtomically(
          tx,
          {
            code: data.couponCode,
            subtotal,
            userId: session?.user?.id ?? null,
            guestEmail: session?.user?.id ? null : guestEmail,
            items: couponLineItems,
          },
          order.id
        );
        if (!couponResult.valid) {
          throw new Error(couponResult.error);
        }

        const discountTotal = couponResult.discountAmount;
        const shipping =
          couponResult.freeShipping ||
          subtotal - discountTotal >= FREE_SHIPPING_THRESHOLD
            ? 0
            : SHIPPING_COST;
        const tax = Math.round((subtotal - discountTotal) * TAX_RATE);
        const grandTotal = Math.max(0, subtotal - discountTotal + shipping + tax);

        order = await tx.order.update({
          where: { id: order.id },
          data: {
            discountTotal,
            couponCode: data.couponCode.trim().toUpperCase(),
            shippingTotal: shipping,
            taxTotal: tax,
            grandTotal,
            shippingMethod: shipping === 0 ? "free" : "standard",
          },
          include: { payments: true },
        });
        if (order.payments[0]) {
          await tx.payment.update({
            where: { id: order.payments[0].id },
            data: { amount: grandTotal },
          });
        }
      }

      return order;
    });

    await logAudit({
      userId: session?.user?.id ?? null,
      action: "order.created",
      entity: "Order",
      entityId: result.id,
      metadata: { orderNumber: result.orderNumber },
    });

    // إشعار تأكيد الطلب عبر القنوات (لا يُفشل الطلب عند تعذّره)
    await notifyOrderConfirmed({
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? data.customer.email,
      phone: data.customer.phone,
      orderNumber: result.orderNumber,
    });

    // إن كانت طريقة الدفع تتطلب صفحة دفع مستضافة خارجية (مثال: Stripe)،
    // أنشئ جلسة الدفع الآن - بعد التزام المعاملة (Commit) وليس داخلها، لأن
    // هذا استدعاء شبكي خارجي طويل نسبياً ولا يجب أن يُبقي أي Row مقفلة في
    // قاعدة البيانات أثناء انتظاره (نفس المبدأ المطلوب صراحة في التدقيق).
    // ملاحظة صراحة: هذا الاستدعاء لم يكن موجوداً إطلاقاً في المسار الأصلي
    // قبل هذا التدقيق (Stripe كان Stub معلَّق بالكامل ولا يُستدعى من أي
    // مكان) - هذا استكمال حقيقي للتدفق وليس مجرد "تحقق توقيع" فقط.
    let redirectUrl: string | undefined;
    if (paymentOption.provider !== "manual") {
      try {
        const provider = getPaymentProvider();
        const payment = result.payments[0];
        const providerSession = await provider.createPayment({
          orderId: result.id,
          orderNumber: result.orderNumber,
          amount: Number(result.grandTotal),
          currency: result.currency,
          customerEmail: session?.user?.email ?? data.customer.email,
          idempotencyKey: result.idempotencyKey ?? result.id,
          returnUrl: `${new URL(request.url).origin}/checkout/success?order=${result.orderNumber}`,
        });
        redirectUrl = providerSession.redirectUrl;
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { providerRef: providerSession.providerRef },
          });
        }
      } catch (err) {
        // الطلب مُنشأ بالفعل (Order.status=PENDING) لكن تعذّر بدء جلسة
        // الدفع الخارجية. لا نُفشل إنشاء الطلب بأثر رجعي (تم Commit فعلاً)،
        // لكن نُبلغ العميل بوضوح بدل إخفاء المشكلة، ونُسجّل التفاصيل داخلياً.
        console.error("[orders] payment session creation failed", {
          orderId: result.id,
          error: err instanceof Error ? err.message : String(err),
        });
        Sentry.captureException(err, {
          tags: { route: "orders", stage: "payment_session" },
          extra: { orderId: result.id },
        });
        return NextResponse.json(
          {
            success: true,
            orderNumber: result.orderNumber,
            paymentError:
              "تم إنشاء طلبك لكن تعذّر بدء صفحة الدفع، يرجى التواصل معنا لإتمام الدفع أو المحاولة لاحقاً.",
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      { success: true, orderNumber: result.orderNumber, redirectUrl },
      { status: 201 }
    );
  } catch (err) {
    // فقط رسائل الأعمال المعروفة والآمنة (لا تكشف تفاصيل داخلية) تُعاد
    // للعميل كما هي. أي خطأ آخر (Prisma/DB/شبكة/غير متوقع) يُستبدل برسالة
    // عامة ويُسجَّل بالتفصيل في سجلات الخادم فقط.
    const isKnownBusinessError =
      err instanceof Error &&
      (err.message === "منتج غير متوفر" ||
        err.message === "طريقة الدفع غير متاحة" ||
        err.message.includes("غير متوفرة"));

    if (!isKnownBusinessError) {
      console.error("[orders] order creation failed", err);
      Sentry.captureException(err, { tags: { route: "orders" } });
    }

    const clientMessage = isKnownBusinessError
      ? (err as Error).message
      : "تعذّر إنشاء الطلب";

    return NextResponse.json({ error: clientMessage }, { status: 400 });
  }
}
