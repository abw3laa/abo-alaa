"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { VALID_SETTING_KEYS } from "@/lib/settings-defs";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** حفظ مجموعة إعدادات (مفتاح/قيمة نصية) */
export async function saveSettings(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

    const MAX_VALUE_LENGTH = 5000;

    // نمرّر الحقول كأزواج setting_<key> = value، group_<key> = group
    // - لا نثق بأي مفتاح إلا إن كان ضمن القائمة المعروفة صراحة
    //   (VALID_SETTING_KEYS)، لأن Server Action قابل للاستدعاء بطلب POST
    //   مباشر يحمل FormData حراً، وليس بالضرورة عبر النموذج المعروض فقط.
    // - نحدّ طول القيمة لمنع تخزين نصوص ضخمة غير مبرَّرة.
    const entries: { key: string; value: string; group: string }[] = [];
    const rejectedKeys: string[] = [];
    for (const [name, val] of formData.entries()) {
      if (name.startsWith("setting_")) {
        const key = name.slice("setting_".length);
        if (!VALID_SETTING_KEYS.has(key)) {
          rejectedKeys.push(key);
          continue;
        }
        const group = (formData.get(`group_${key}`) as string) || "general";
        const value = String(val).slice(0, MAX_VALUE_LENGTH);
        entries.push({ key, value, group });
      }
    }

    if (rejectedKeys.length > 0) {
      // محاولة كتابة مفاتيح غير معروفة - لا نُفشل الحفظ بالكامل (الحقول
      // الصالحة الأخرى تُحفظ)، لكن نُسجّلها في Audit لأنها إشارة محتملة
      // على تلاعب مباشر بالـServer Action
      await logAudit({
        userId: user.id,
        action: "settings.rejected_unknown_keys",
        entity: "Setting",
        metadata: { rejectedKeys },
      });
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
