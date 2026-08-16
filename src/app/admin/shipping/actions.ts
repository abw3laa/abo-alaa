"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------- شركات الشحن ----------

export async function saveCarrier(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SHIPPING_MANAGE);
    const id = (formData.get("id") as string) || undefined;
    const name = (formData.get("name") as string)?.trim();
    const isActive = formData.get("isActive") === "on";
    if (!name || name.length < 2) {
      return { ok: false, error: "اسم شركة الشحن قصير جداً" };
    }
    if (id) {
      await prisma.shippingCarrier.update({
        where: { id },
        data: { name, isActive },
      });
    } else {
      await prisma.shippingCarrier.create({ data: { name, isActive } });
    }
    await logAudit({
      userId: user.id,
      action: id ? "carrier.update" : "carrier.create",
      entity: "ShippingCarrier",
      entityId: id,
    });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ شركة الشحن" };
  }
}

export async function deleteCarrier(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SHIPPING_MANAGE);
    await prisma.shippingCarrier.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "carrier.delete",
      entity: "ShippingCarrier",
      entityId: id,
    });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف شركة الشحن" };
  }
}

// ---------- مناطق الشحن ----------

const zoneSchema = z.object({
  id: z.string().optional(),
  carrierId: z.string().min(1),
  name: z.string().min(2, "اسم المنطقة قصير جداً"),
  countries: z.string().optional(), // مفصولة بفواصل
  baseCost: z.coerce.number().min(0),
  perKgCost: z.coerce.number().min(0).optional(),
  freeOver: z.coerce.number().optional(),
  estimatedDaysMin: z.coerce.number().int().min(0).optional(),
  estimatedDaysMax: z.coerce.number().int().min(0).optional(),
  isExpress: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveZone(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SHIPPING_MANAGE);
    const parsed = zoneSchema.safeParse({
      id: formData.get("id") || undefined,
      carrierId: formData.get("carrierId"),
      name: formData.get("name"),
      countries: formData.get("countries") || undefined,
      baseCost: formData.get("baseCost"),
      perKgCost: formData.get("perKgCost") || 0,
      freeOver: formData.get("freeOver") || undefined,
      estimatedDaysMin: formData.get("estimatedDaysMin") || 2,
      estimatedDaysMax: formData.get("estimatedDaysMax") || 5,
      isExpress: formData.get("isExpress") === "on",
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;
    const countries = d.countries
      ? d.countries
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      : [];

    const data = {
      carrierId: d.carrierId,
      name: d.name,
      countries,
      baseCost: d.baseCost,
      perKgCost: d.perKgCost ?? 0,
      freeOver: d.freeOver ?? null,
      estimatedDaysMin: d.estimatedDaysMin ?? 2,
      estimatedDaysMax: d.estimatedDaysMax ?? 5,
      isExpress: d.isExpress ?? false,
      isActive: d.isActive ?? true,
    };

    if (d.id) {
      await prisma.shippingZone.update({ where: { id: d.id }, data });
    } else {
      await prisma.shippingZone.create({ data });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "zone.update" : "zone.create",
      entity: "ShippingZone",
      entityId: d.id,
    });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ منطقة الشحن" };
  }
}

export async function deleteZone(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SHIPPING_MANAGE);
    await prisma.shippingZone.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "zone.delete",
      entity: "ShippingZone",
      entityId: id,
    });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف المنطقة" };
  }
}
