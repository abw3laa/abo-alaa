"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** حذف كوبون */
export async function deleteCoupon(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.COUPONS_MANAGE);
    await prisma.coupon.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "coupon.delete",
      entity: "Coupon",
      entityId: id,
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف الكوبون" };
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(3, "الكود قصير جداً").toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minOrderAmount: z.coerce.number().optional(),
  maxUses: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

/** تعديل كوبون قائم */
export async function updateCoupon(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.COUPONS_MANAGE);
    const parsed = updateSchema.safeParse({
      id: formData.get("id"),
      code: formData.get("code"),
      type: formData.get("type"),
      value: formData.get("value"),
      minOrderAmount: formData.get("minOrderAmount") || undefined,
      maxUses: formData.get("maxUses") || undefined,
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    // منع تعارض الكود مع كوبون آخر
    const clash = await prisma.coupon.findFirst({
      where: { code: d.code, id: { not: d.id } },
    });
    if (clash) return { ok: false, error: "الكود مستخدم في كوبون آخر" };

    await prisma.coupon.update({
      where: { id: d.id },
      data: {
        code: d.code,
        type: d.type,
        value: d.value,
        minOrderAmount: d.minOrderAmount ?? null,
        maxUses: d.maxUses ?? null,
        isActive: d.isActive ?? true,
      },
    });
    await logAudit({
      userId: user.id,
      action: "coupon.update",
      entity: "Coupon",
      entityId: d.id,
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تحديث الكوبون" };
  }
}
