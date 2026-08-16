"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth/guard";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ==================== الملف الشخصي ====================

const profileSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  phone: z.string().optional(),
  locale: z.enum(["ar", "en", "tr"]).optional(),
});

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      locale: formData.get("locale") || undefined,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        locale: parsed.data.locale ?? undefined,
      },
    });
    revalidatePath("/account");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تحديث الملف الشخصي" };
  }
}

// ==================== العناوين ====================

const addressSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(5, "رقم الهاتف مطلوب"),
  country: z.string().min(2, "الدولة مطلوبة"),
  city: z.string().min(1, "المدينة مطلوبة"),
  state: z.string().optional(),
  street: z.string().min(1, "الشارع مطلوب"),
  building: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.coerce.boolean().optional(),
});

export async function saveAddress(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = addressSchema.safeParse({
      id: formData.get("id") || undefined,
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      country: formData.get("country"),
      city: formData.get("city"),
      state: formData.get("state") || undefined,
      street: formData.get("street"),
      building: formData.get("building") || undefined,
      postalCode: formData.get("postalCode") || undefined,
      notes: formData.get("notes") || undefined,
      isDefault: formData.get("isDefault") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    // إن كان هذا العنوان افتراضياً نلغي الافتراضي عن البقية
    if (d.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const data = {
      fullName: d.fullName,
      phone: d.phone,
      country: d.country,
      city: d.city,
      state: d.state || null,
      street: d.street,
      building: d.building || null,
      postalCode: d.postalCode || null,
      notes: d.notes || null,
      isDefault: d.isDefault ?? false,
    };

    if (d.id) {
      // نتأكد أن العنوان يخص المستخدم
      const own = await prisma.address.findFirst({
        where: { id: d.id, userId: user.id },
        select: { id: true },
      });
      if (!own) return { ok: false, error: "العنوان غير موجود" };
      await prisma.address.update({ where: { id: d.id }, data });
    } else {
      await prisma.address.create({ data: { ...data, userId: user.id } });
    }
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ العنوان" };
  }
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const own = await prisma.address.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!own) return { ok: false, error: "العنوان غير موجود" };
    await prisma.address.delete({ where: { id } });
    revalidatePath("/account/addresses");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف العنوان" };
  }
}
