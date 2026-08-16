"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth/guard";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

/** إعادة حساب متوسط التقييم وعدده للمنتج (المراجعات المعتمدة فقط) */
async function recalcRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAverage: agg._avg.rating ?? 0,
      ratingCount: agg._count,
    },
  });
}

export async function submitReview(
  _prev: ReviewResult | null,
  formData: FormData
): Promise<ReviewResult> {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse({
      productId: formData.get("productId"),
      rating: formData.get("rating"),
      title: formData.get("title") || undefined,
      comment: formData.get("comment") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: "بيانات المراجعة غير صالحة" };
    }
    const d = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id: d.productId },
      select: { id: true, slug: true },
    });
    if (!product) return { ok: false, error: "المنتج غير موجود" };

    // منع أكثر من مراجعة واحدة لكل مستخدم لكل منتج
    const existing = await prisma.review.findFirst({
      where: { productId: d.productId, userId: user.id },
    });

    // هل اشترى المستخدم هذا المنتج؟ (مراجعة موثّقة)
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: d.productId,
        order: { userId: user.id, status: { in: ["DELIVERED", "SHIPPED"] } },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: d.rating,
          title: d.title,
          comment: d.comment,
          isVerifiedPurchase: !!purchased,
        },
      });
    } else {
      await prisma.review.create({
        data: {
          productId: d.productId,
          userId: user.id,
          rating: d.rating,
          title: d.title,
          comment: d.comment,
          isApproved: true, // نعتمد المراجعة مباشرة
          isVerifiedPurchase: !!purchased,
        },
      });
    }

    await recalcRating(d.productId);
    revalidatePath(`/products/${product.slug}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر إرسال المراجعة" };
  }
}
