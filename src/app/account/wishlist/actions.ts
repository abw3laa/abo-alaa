"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth/guard";

export type WishlistResult =
  | { ok: true; added: boolean }
  | { ok: false; error: string };

/** تبديل حالة المنتج في المفضلة (إضافة/إزالة) */
export async function toggleWishlist(
  productId: string
): Promise<WishlistResult> {
  try {
    const user = await requireUser();
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath("/account/wishlist");
      return { ok: true, added: false };
    }

    await prisma.wishlistItem.create({
      data: { userId: user.id, productId },
    });
    revalidatePath("/account/wishlist");
    return { ok: true, added: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}

/** إزالة عنصر من المفضلة */
export async function removeWishlistItem(
  productId: string
): Promise<WishlistResult> {
  try {
    const user = await requireUser();
    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });
    revalidatePath("/account/wishlist");
    return { ok: true, added: false };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}
