import { Prisma, type Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CouponLineItem {
  productId: string;
  lineTotal: number;
  categoryIds: string[];
  brandId: string | null;
}

export interface CouponContext {
  code: string;
  subtotal: number;
  userId: string | null;
  guestEmail: string | null;
  items: CouponLineItem[];
}

export type CouponCheckResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
      freeShipping: boolean;
    }
  | { valid: false; error: string };

function normalizeGuestEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

/**
 * تحقق (Read-only) من صلاحية كوبون وحساب قيمة الخصم - يُستخدم للمعاينة
 * قبل إنشاء الطلب (لا يستهلك الكوبون). التحقق الفعلي والاستهلاك الذرّي
 * يحدثان معاً في applyCouponAtomically داخل معاملة إنشاء الطلب، لأن هذه
 * الدالة وحدها عرضة لسباق تحقق-ثم-استخدام (TOCTOU) إن استُخدمت بمفردها
 * لاتخاذ قرار الخصم النهائي.
 */
export async function checkCoupon(
  ctx: CouponContext
): Promise<CouponCheckResult> {
  const guestEmail = normalizeGuestEmail(ctx.guestEmail);
  const coupon = await prisma.coupon.findUnique({
    where: { code: ctx.code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    return { valid: false, error: "كود الخصم غير صالح" };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, error: "كود الخصم لم يبدأ بعد" };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, error: "انتهت صلاحية كود الخصم" };
  }
  if (
    coupon.minOrderAmount &&
    ctx.subtotal < Number(coupon.minOrderAmount)
  ) {
    return {
      valid: false,
      error: `الحد الأدنى للطلب لاستخدام هذا الكود ${coupon.minOrderAmount}`,
    };
  }

  // قيود الفئات/الماركات: إن كانت محددة، يجب أن يحتوي الطلب على عنصر
  // واحد على الأقل مطابق لها. الخصم يُحسب فقط على العناصر المطابقة.
  let eligibleItems = ctx.items;
  if (coupon.categoryIds.length > 0 || coupon.brandIds.length > 0) {
    eligibleItems = ctx.items.filter(
      (item) =>
        item.categoryIds.some((c) => coupon.categoryIds.includes(c)) ||
        (item.brandId && coupon.brandIds.includes(item.brandId))
    );
    if (eligibleItems.length === 0) {
      return {
        valid: false,
        error: "كود الخصم غير قابل للتطبيق على منتجات هذا الطلب",
      };
    }
  }
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, i) => sum + i.lineTotal,
    0
  );

  // الحد الأقصى الكلي للاستخدام
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "تم استنفاد عدد مرات استخدام هذا الكود" };
  }

  // الحد الأقصى لكل مستخدم (يشمل الضيوف عبر البريد الإلكتروني)
  if (coupon.maxUsesPerUser !== null) {
    const usageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        OR: [
          ctx.userId ? { userId: ctx.userId } : {},
          guestEmail ? { guestEmail } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });
    if (usageCount >= coupon.maxUsesPerUser) {
      return {
        valid: false,
        error: "لقد استخدمت هذا الكود بالفعل الحد الأقصى من المرات المسموحة",
      };
    }
  }

  // أول طلب فقط
  if (coupon.firstOrderOnly) {
    const priorOrders = await prisma.order.count({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          ctx.userId ? { userId: ctx.userId } : {},
          guestEmail ? { guestEmail } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });
    if (priorOrders > 0) {
      return {
        valid: false,
        error: "هذا الكود مخصَّص لأول طلب فقط",
      };
    }
  }

  let discountAmount = 0;
  let freeShipping = false;
  switch (coupon.type) {
    case "PERCENTAGE":
      discountAmount = (eligibleSubtotal * Number(coupon.value)) / 100;
      break;
    case "FIXED":
      discountAmount = Math.min(Number(coupon.value), eligibleSubtotal);
      break;
    case "FREE_SHIPPING":
      freeShipping = true;
      break;
  }
  // لا يمكن أن يتجاوز الخصم قيمة الطلب المؤهلة نفسها (يمنع مجموعاً سالباً)
  discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));

  return { valid: true, coupon, discountAmount, freeShipping };
}

/**
 * استهلاك ذرّي للكوبون داخل معاملة إنشاء الطلب (tx). يُعيد نفس نتيجة
 * checkCoupon لكن يزيد usedCount بشكل ذرّي (updateMany + شرط الحد
 * الأقصى) ويُنشئ سجل CouponUsage مرتبطاً بالطلب - كل ذلك ضمن نفس
 * المعاملة التي تُنشئ الطلب، بحيث لا يمكن لطلبين متزامنين تجاوز
 * maxUses معاً (نفس نمط الحماية المستخدم في خصم المخزون).
 */
export async function applyCouponAtomically(
  tx: Prisma.TransactionClient,
  ctx: CouponContext,
  orderId: string
): Promise<CouponCheckResult> {
  const coupon = await tx.coupon.findUnique({
    where: { code: ctx.code.trim().toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    return { valid: false, error: "كود الخصم غير صالح" };
  }

  const guestEmail = normalizeGuestEmail(ctx.guestEmail);
  const customerScope = ctx.userId
    ? `user:${ctx.userId}`
    : `guest:${guestEmail ?? "unknown"}`;

  // Serialize coupon checks for the same customer. This protects the
  // per-user limit and first-order-only rule from concurrent check-then-use
  // requests without relying on an in-memory lock.
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`coupon:${coupon.id}:${customerScope}`}))`
  );

  // إعادة كل فحوصات checkCoupon باستخدام tx (وليس prisma العام) لضمان
  // قراءة متسقة ضمن نفس المعاملة
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, error: "كود الخصم لم يبدأ بعد" };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, error: "انتهت صلاحية كود الخصم" };
  }
  if (coupon.minOrderAmount && ctx.subtotal < Number(coupon.minOrderAmount)) {
    return { valid: false, error: "الطلب أقل من الحد الأدنى لهذا الكود" };
  }

  let eligibleItems = ctx.items;
  if (coupon.categoryIds.length > 0 || coupon.brandIds.length > 0) {
    eligibleItems = ctx.items.filter(
      (item) =>
        item.categoryIds.some((c) => coupon.categoryIds.includes(c)) ||
        (item.brandId && coupon.brandIds.includes(item.brandId))
    );
    if (eligibleItems.length === 0) {
      return {
        valid: false,
        error: "كود الخصم غير قابل للتطبيق على منتجات هذا الطلب",
      };
    }
  }
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, i) => sum + i.lineTotal,
    0
  );

  if (coupon.maxUsesPerUser !== null) {
    const usageCount = await tx.couponUsage.count({
      where: {
        couponId: coupon.id,
        OR: [
          ctx.userId ? { userId: ctx.userId } : {},
          guestEmail ? { guestEmail } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });
    if (usageCount >= coupon.maxUsesPerUser) {
      return { valid: false, error: "تم استخدام هذا الكود بالحد الأقصى" };
    }
  }

  if (coupon.firstOrderOnly) {
    const priorOrders = await tx.order.count({
      where: {
        id: { not: orderId },
        status: { not: "CANCELLED" },
        OR: [
          ctx.userId ? { userId: ctx.userId } : {},
          guestEmail ? { guestEmail } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });
    if (priorOrders > 0) {
      return { valid: false, error: "هذا الكود مخصَّص لأول طلب فقط" };
    }
  }

  // الاستهلاك الذرّي الفعلي: يزيد usedCount فقط إن كان لا يزال ضمن الحد
  // (أو بلا حد). هذا هو ما يمنع Race Condition الفعلي - وليس الفحوصات
  // أعلاه وحدها.
  const updated = await tx.coupon.updateMany({
    where: {
      id: coupon.id,
      ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
    },
    data: { usedCount: { increment: 1 } },
  });
  if (updated.count !== 1) {
    return { valid: false, error: "تم استنفاد عدد مرات استخدام هذا الكود" };
  }

  await tx.couponUsage.create({
    data: {
      couponId: coupon.id,
      userId: ctx.userId,
      guestEmail: ctx.userId ? null : guestEmail,
      orderId,
    },
  });

  let discountAmount = 0;
  let freeShipping = false;
  switch (coupon.type) {
    case "PERCENTAGE":
      discountAmount = (eligibleSubtotal * Number(coupon.value)) / 100;
      break;
    case "FIXED":
      discountAmount = Math.min(Number(coupon.value), eligibleSubtotal);
      break;
    case "FREE_SHIPPING":
      freeShipping = true;
      break;
  }
  discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));

  return { valid: true, coupon, discountAmount, freeShipping };
}
