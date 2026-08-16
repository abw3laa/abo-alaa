"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const methodSchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .min(2, "الرمز قصير جداً")
    .regex(/^[a-z0-9_]+$/, "الرمز يجب أن يكون أحرفاً إنجليزية صغيرة وأرقاماً"),
  name: z.string().min(2, "الاسم قصير جداً"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  provider: z.enum(["manual", "stripe", "paypal"]).optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function savePaymentMethod(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.PAYMENTS_MANAGE);
    const parsed = methodSchema.safeParse({
      id: formData.get("id") || undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      instructions: formData.get("instructions") || undefined,
      provider: formData.get("provider") || "manual",
      isActive: formData.get("isActive") === "on",
      sortOrder: formData.get("sortOrder") || 0,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    // منع تكرار الرمز
    const clash = await prisma.paymentMethodOption.findFirst({
      where: { code: d.code, id: d.id ? { not: d.id } : undefined },
    });
    if (clash) return { ok: false, error: "الرمز مستخدم بالفعل" };

    const data = {
      code: d.code,
      name: d.name,
      description: d.description || null,
      instructions: d.instructions || null,
      provider: d.provider ?? "manual",
      isActive: d.isActive ?? true,
      sortOrder: d.sortOrder ?? 0,
    };

    if (d.id) {
      await prisma.paymentMethodOption.update({ where: { id: d.id }, data });
    } else {
      await prisma.paymentMethodOption.create({ data });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "payment_method.update" : "payment_method.create",
      entity: "PaymentMethodOption",
      entityId: d.id,
    });
    revalidatePath("/admin/payments");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ طريقة الدفع" };
  }
}

export async function deletePaymentMethod(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.PAYMENTS_MANAGE);
    await prisma.paymentMethodOption.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "payment_method.delete",
      entity: "PaymentMethodOption",
      entityId: id,
    });
    revalidatePath("/admin/payments");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف طريقة الدفع" };
  }
}
