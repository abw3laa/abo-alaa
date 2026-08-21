import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkCoupon } from "@/lib/coupons";
import { rateLimit, getClientId } from "@/lib/rate-limit";

const schema = z.object({
  code: z.string().min(1).max(40),
  email: z.string().email().optional(),
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

/**
 * معاينة كوبون قبل إتمام الطلب (لا تستهلكه). الاستهلاك الفعلي والتحقق
 * النهائي (المحصَّن من Race Conditions) يحدثان فقط عند إنشاء الطلب في
 * /api/orders ضمن نفس المعاملة الذرّية.
 */
export async function POST(request: Request) {
  const clientId = getClientId(request);
  // حماية من تجربة أكواد كثيرة بسرعة (Brute-force على أكواد الخصم)
  const limit = await rateLimit(`coupon-preview:${clientId}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقاً" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const data = parsed.data;
  const session = await auth();

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      variants: true,
      categories: { select: { categoryId: true } },
    },
  });

  let subtotal = 0;
  const lineItems = data.items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return [];
    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : product.variants[0];
    const unitPrice = Number(variant?.price ?? product.price);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    return [
      {
        productId: product.id,
        lineTotal,
        categoryIds: product.categories.map((c) => c.categoryId),
        brandId: product.brandId,
      },
    ];
  });

  // Never disclose pricing or coupon eligibility for drafts, deleted
  // products, or invalid variants supplied by a client.
  if (lineItems.length !== data.items.length) {
    return NextResponse.json({ error: "بيانات المنتجات غير صالحة" }, { status: 400 });
  }

  const result = await checkCoupon({
    code: data.code,
    subtotal,
    userId: session?.user?.id ?? null,
    guestEmail: session?.user?.id ? null : (data.email ?? null),
    items: lineItems,
  });

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error });
  }

  return NextResponse.json({
    valid: true,
    discountAmount: result.discountAmount,
    freeShipping: result.freeShipping,
    description: result.coupon.description,
  });
}
