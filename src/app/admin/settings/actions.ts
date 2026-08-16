"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** حفظ مجموعة إعدادات (مفتاح/قيمة نصية) */
export async function saveSettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

    // نمرّر الحقول كأزواج setting_<key> = value، group_<key> = group
    const entries: { key: string; value: string; group: string }[] = [];
    for (const [name, val] of formData.entries()) {
      if (name.startsWith("setting_")) {
        const key = name.slice("setting_".length);
        const group = (formData.get(`group_${key}`) as string) || "general";
        entries.push({ key, value: String(val), group });
      }
    }

    for (const e of entries) {
      await prisma.setting.upsert({
        where: { key: e.key },
        update: { value: e.value, group: e.group },
        create: { key: e.key, value: e.value, group: e.group },
      });
    }

    await logAudit({
      userId: user.id,
      action: "settings.update",
      entity: "Setting",
      metadata: { keys: entries.map((e) => e.key) },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/about");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ الإعدادات" };
  }
}
