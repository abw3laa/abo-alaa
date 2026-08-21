"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const couponSchema = z.object({
  code: z.string().min(3, "الكود قصير جداً").toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minOrderAmount: z.coerce.number().optional(),
  maxUses: z.coerce.number().int().optional(),
  maxUsesPerUser: z.coerce.number().int().positive().optional(),
  firstOrderOnly: z.coerce.boolean().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function createCoupon(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.COUPONS_MANAGE);
    const parsed = couponSchema.safeParse({
      code: formData.get("code"),
      type: formData.get("type"),
      value: formData.get("value"),
      minOrderAmount: formData.get("minOrderAmount") || undefined,
      maxUses: formData.get("maxUses") || undefined,
      maxUsesPerUser: formData.get("maxUsesPerUser") || undefined,
      firstOrderOnly: formData.get("firstOrderOnly") === "on",
      startsAt: formData.get("startsAt") || undefined,
      expiresAt: formData.get("expiresAt") || undefined,
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;
    const startsAt = d.startsAt ? new Date(d.startsAt) : null;
    const expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      return {
        ok: false,
        error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
      };
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: d.code },
    });
    if (existing) {
      return { ok: false, error: "الكود مستخدم بالفعل" };
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: d.code,
        type: d.type,
        value: d.value,
        minOrderAmount: d.minOrderAmount ?? null,
        maxUses: d.maxUses ?? null,
        maxUsesPerUser: d.maxUsesPerUser ?? null,
        firstOrderOnly: d.firstOrderOnly ?? false,
        startsAt,
        expiresAt,
        isActive: d.isActive ?? true,
      },
    });
    await logAudit({
      userId: user.id,
      action: "coupon.create",
      entity: "Coupon",
      entityId: coupon.id,
      metadata: { code: d.code },
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر إنشاء الكوبون" };
  }
}

export async function toggleCoupon(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.COUPONS_MANAGE);
    await prisma.coupon.update({
      where: { id },
      data: { isActive: active },
    });
    await logAudit({
      userId: user.id,
      action: "coupon.toggle",
      entity: "Coupon",
      entityId: id,
      metadata: { active },
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}
