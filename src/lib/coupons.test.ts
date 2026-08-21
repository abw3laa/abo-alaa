import { describe, it, expect, vi } from "vitest";
import type { Prisma, Coupon } from "@prisma/client";

// coupons.ts يستورد أيضاً singleton الـprisma الحقيقي (لأجل checkCoupon،
// دالة المعاينة غير الذرّية) في أعلى الملف - وهذا الاستيراد وحده يتطلب
// تشغيل `prisma generate` مسبقاً (غير متاح في هذه البيئة، انظر
// SECURITY-HARDENING-REPORT.txt). applyCouponAtomically (قيد الاختبار
// هنا) لا يلمس هذا الـsingleton إطلاقاً - يستقبل tx كمعامل مباشر - لذا
// المحاكاة أدناه تكفي لعزل الاختبار عن هذا القيد البيئي بلا أي تعديل
// على الكود المصدري نفسه.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { applyCouponAtomically } = await import("@/lib/coupons");

function baseCoupon(overrides: Partial<Coupon> = {}): Coupon {
  const now = new Date();
  return {
    id: "coupon-1",
    code: "SAVE10",
    description: null,
    type: "PERCENTAGE",
    value: 10 as unknown as Coupon["value"],
    minOrderAmount: null,
    maxUses: null,
    maxUsesPerUser: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    firstOrderOnly: false,
    categoryIds: [],
    brandIds: [],
    allowStacking: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Coupon;
}

/**
 * يبني tx وهمي بالحد الأدنى من الدوال التي يستدعيها applyCouponAtomically
 * فعلياً - بدل محاكاة كامل عميل Prisma (هش وواسع النطاق بلا فائدة هنا).
 */
function fakeTx(opts: {
  coupon: Coupon | null;
  usageCount?: number;
  priorOrders?: number;
  updateManyCount?: number;
}) {
  const updateMany = vi.fn().mockResolvedValue({
    count: opts.updateManyCount ?? 1,
  });
  const create = vi.fn().mockResolvedValue({});
  return {
    tx: {
      coupon: {
        findUnique: vi.fn().mockResolvedValue(opts.coupon),
        updateMany,
      },
      couponUsage: {
        count: vi.fn().mockResolvedValue(opts.usageCount ?? 0),
        create,
      },
      order: {
        count: vi.fn().mockResolvedValue(opts.priorOrders ?? 0),
      },
      $executeRaw: vi.fn().mockResolvedValue(0),
    } as unknown as Prisma.TransactionClient,
    updateMany,
    create,
  };
}

const items = [
  { productId: "p1", lineTotal: 200, categoryIds: ["cat-shoes"], brandId: "brand-x" },
];

describe("applyCouponAtomically", () => {
  it("يحسب خصم النسبة المئوية بشكل صحيح ويستهلك الكوبون", async () => {
    const { tx, updateMany, create } = fakeTx({
      coupon: baseCoupon({ type: "PERCENTAGE", value: 10 as never }),
    });

    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountAmount).toBe(20); // 10% of 200
      expect(result.freeShipping).toBe(false);
    }
    expect(updateMany).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      data: { couponId: "coupon-1", userId: "u1", guestEmail: null, orderId: "order-1" },
    });
  });

  it("يحسب خصماً ثابتاً بلا تجاوز قيمة الطلب نفسها", async () => {
    const { tx } = fakeTx({
      coupon: baseCoupon({ type: "FIXED", value: 5000 as never }), // أكبر بكثير من الطلب
    });
    const result = await applyCouponAtomically(
      tx,
      { code: "BIG", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      // الخصم لا يمكن أن يتجاوز 200 (قيمة الطلب) حتى لو كانت قيمة الكوبون 5000
      expect(result.discountAmount).toBe(200);
    }
  });

  it("شحن مجاني: discountAmount=0 وfreeShipping=true", async () => {
    const { tx } = fakeTx({ coupon: baseCoupon({ type: "FREE_SHIPPING" }) });
    const result = await applyCouponAtomically(
      tx,
      { code: "FREESHIP", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.freeShipping).toBe(true);
      expect(result.discountAmount).toBe(0);
    }
  });

  it("يرفض كوبوناً غير موجود", async () => {
    const { tx } = fakeTx({ coupon: null });
    const result = await applyCouponAtomically(
      tx,
      { code: "NOPE", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض كوبوناً غير فعّال", async () => {
    const { tx } = fakeTx({ coupon: baseCoupon({ isActive: false }) });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض كوبوناً منتهي الصلاحية", async () => {
    const yesterday = new Date(Date.now() - 86400_000);
    const { tx } = fakeTx({ coupon: baseCoupon({ expiresAt: yesterday }) });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض طلباً أقل من الحد الأدنى", async () => {
    const { tx } = fakeTx({
      coupon: baseCoupon({ minOrderAmount: 500 as never }),
    });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض عند استنفاد الحد الأقصى للاستخدام لكل مستخدم", async () => {
    const { tx } = fakeTx({
      coupon: baseCoupon({ maxUsesPerUser: 1 }),
      usageCount: 1, // استخدمه المستخدم بالفعل مرة واحدة (الحد)
    });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض عندما لا تطابق منتجات الطلب قيود الفئة/الماركة", async () => {
    const { tx } = fakeTx({
      coupon: baseCoupon({ categoryIds: ["cat-electronics"] }),
    });
    const result = await applyCouponAtomically(
      tx,
      // العنصر الوحيد من فئة "cat-shoes" - لا يطابق قيد الكوبون
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض عند 'أول طلب فقط' إن وُجدت طلبات سابقة", async () => {
    const { tx } = fakeTx({
      coupon: baseCoupon({ firstOrderOnly: true }),
      priorOrders: 1,
    });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يرفض عند تجاوز الحد الأقصى الكلي فعلياً وقت الاستهلاك الذرّي (سباق)", async () => {
    // هذا هو الفحص الجوهري لمنع Race Condition: حتى لو مرّت كل الفحوصات
    // القرائية، updateMany نفسها هي خط الدفاع الأخير - نحاكي هنا حالة
    // وصول طلب منافس واستهلك آخر استخدام متبقٍ للتو (updateMany تُعيد
    // count:0 لأن الشرط lt maxUses لم يعد يتحقق)
    const { tx } = fakeTx({
      coupon: baseCoupon({ maxUses: 5, usedCount: 5 }),
      updateManyCount: 0,
    });
    const result = await applyCouponAtomically(
      tx,
      { code: "SAVE10", subtotal: 200, userId: "u1", guestEmail: null, items },
      "order-1"
    );
    expect(result.valid).toBe(false);
  });

  it("يستخدم guestEmail بدل userId للضيوف", async () => {
    const { tx, create } = fakeTx({ coupon: baseCoupon() });
    await applyCouponAtomically(
      tx,
      {
        code: "SAVE10",
        subtotal: 200,
        userId: null,
        guestEmail: "guest@example.com",
        items,
      },
      "order-1"
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        couponId: "coupon-1",
        userId: null,
        guestEmail: "guest@example.com",
        orderId: "order-1",
      },
    });
  });
});
