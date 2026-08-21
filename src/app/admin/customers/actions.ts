"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * إجراءات هذا الملف مخصّصة لإدارة العملاء (CUSTOMER) فقط.
 * CUSTOMERS_MANAGE ليست صلاحية كافية بمفردها للتأثير على حسابات الموظفين
 * (ADMIN/MANAGER/...)؛ يجب التأكد أن الهدف عميل فعلياً، وإلا فهذا تصعيد
 * صلاحيات غير مباشر (Admin يستخدم "إدارة العملاء" لحظر/تعديل موظف آخر أو
 * حتى SUPER_ADMIN).
 */
async function assertTargetIsCustomer(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) {
    throw new AuthError("المستخدم غير موجود");
  }
  if (target.role !== "CUSTOMER") {
    throw new AuthError(
      "لا يمكن تنفيذ إجراءات إدارة العملاء على حساب موظف. استخدم إدارة الموظفين."
    );
  }
}

export async function toggleCustomerBan(
  userId: string,
  ban: boolean
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
    await assertTargetIsCustomer(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: ban,
        // حظر يجب أن يُبطل أي جلسة نشطة فوراً (لن ينفع دون هذا لو كان
        // العميل قد سجّل دخوله بالفعل، لأن الدور/الحظر يُقرأ من DB في
        // callback الجلسة على كل طلب، لكن هذا يوثّق زمن الحظر أيضاً)
        sessionsInvalidatedAt: ban ? new Date() : undefined,
      },
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
    await assertTargetIsCustomer(userId);

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
    await assertTargetIsCustomer(userId);

    const parsed = z
      .object({
        points: z.coerce.number().int().refine((n) => n !== 0, {
          message: "أدخل عدد نقاط مختلفاً عن صفر",
        }),
        reason: z.string().min(1, "أدخل سبب المنح").max(300),
      })
      .safeParse({ points, reason });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }

    // منع أن يصبح رصيد النقاط سالباً: عند الخصم، تحقق ذرّياً من كفاية
    // الرصيد الحالي (updateMany + gte) بدل read-then-write. كل ذلك ضمن
    // معاملة واحدة مع تسجيل دفتر النقاط لضمان الاتساق.
    try {
      await prisma.$transaction(async (tx) => {
        if (parsed.data.points < 0) {
          const updated = await tx.user.updateMany({
            where: {
              id: userId,
              loyaltyPoints: { gte: -parsed.data.points },
            },
            data: { loyaltyPoints: { increment: parsed.data.points } },
          });
          if (updated.count !== 1) {
            throw new AuthError("رصيد النقاط الحالي غير كافٍ للخصم");
          }
        } else {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: parsed.data.points } },
          });
        }

        await tx.loyaltyLedger.create({
          data: {
            userId,
            points: parsed.data.points,
            reason: parsed.data.reason,
          },
        });
      });
    } catch (err) {
      if (err instanceof AuthError) return { ok: false, error: err.message };
      throw err;
    }

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
