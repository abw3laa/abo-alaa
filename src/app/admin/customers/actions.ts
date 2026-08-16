"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function toggleCustomerBan(
  userId: string,
  ban: boolean
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: ban },
    });
    await logAudit({
      userId: admin.id,
      action: ban ? "customer.ban" : "customer.unban",
      entity: "User",
      entityId: userId,
    });
    revalidatePath(`/admin/customers/${userId}`);
    revalidatePath("/admin/customers");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}

/** ترقية/تغيير فئة العميل (عادي، منتظم، VIP) */
export async function updateCustomerTier(
  userId: string,
  tier: string
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
    const parsed = z.enum(["NEW", "REGULAR", "VIP"]).safeParse(tier);
    if (!parsed.success) return { ok: false, error: "فئة غير صالحة" };

    await prisma.user.update({
      where: { id: userId },
      data: { tier: parsed.data },
    });
    await logAudit({
      userId: admin.id,
      action: "customer.tier_update",
      entity: "User",
      entityId: userId,
      metadata: { tier: parsed.data },
    });
    revalidatePath(`/admin/customers/${userId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}

/** منح أو خصم نقاط ولاء للعميل مع تسجيلها في دفتر النقاط */
export async function grantLoyaltyPoints(
  userId: string,
  points: number,
  reason: string
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
    const parsed = z
      .object({
        points: z.coerce.number().int(),
        reason: z.string().min(1, "أدخل سبب المنح"),
      })
      .safeParse({ points, reason });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: parsed.data.points } },
      }),
      prisma.loyaltyLedger.create({
        data: {
          userId,
          points: parsed.data.points,
          reason: parsed.data.reason,
        },
      }),
    ]);

    await logAudit({
      userId: admin.id,
      action: "customer.loyalty_grant",
      entity: "User",
      entityId: userId,
      metadata: { points: parsed.data.points, reason: parsed.data.reason },
    });
    revalidatePath(`/admin/customers/${userId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}
