"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";

export type ActionResult = { ok: true } | { ok: false; error: string };

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "الاسم قصير جداً"),
  nameEn: z.string().optional(),
  parentId: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

    // صورة التصنيف من المُحمِّل (JSON array)
    let image = (formData.get("image") as string) || "";
    const mediaRaw = formData.get("media") as string | null;
    if (mediaRaw) {
      try {
        const arr = JSON.parse(mediaRaw);
        if (Array.isArray(arr) && arr[0]?.url) image = arr[0].url;
      } catch {
        /* تجاهل */
      }
    }

    const parsed = categorySchema.safeParse({
      id: formData.get("id") || undefined,
      name: formData.get("name"),
      nameEn: formData.get("nameEn") || undefined,
      parentId: formData.get("parentId") || undefined,
      image,
      icon: formData.get("icon") || undefined,
      sortOrder: formData.get("sortOrder") || 0,
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    const data = {
      name: d.name,
      nameEn: d.nameEn || null,
      parentId: d.parentId || null,
      image: image || null,
      icon: d.icon || null,
      sortOrder: d.sortOrder ?? 0,
      isActive: d.isActive ?? true,
    };

    if (d.id) {
      await prisma.category.update({ where: { id: d.id }, data });
    } else {
      await prisma.category.create({
        data: { ...data, slug: uniqueSlug(d.nameEn || d.name) },
      });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "category.update" : "category.create",
      entity: "Category",
      entityId: d.id,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ التصنيف" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
    // حذف ناعم
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await logAudit({
      userId: user.id,
      action: "category.delete",
      entity: "Category",
      entityId: id,
    });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف التصنيف" };
  }
}
