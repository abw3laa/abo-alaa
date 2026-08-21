import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { SettingsForm, type SettingField } from "@/components/admin/settings-form";
import { SETTING_DEFS } from "@/lib/settings-defs";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const rows = await prisma.setting.findMany();
  const stored = new Map(
    rows.map((r) => {
      // القيمة مخزّنة كـ JSON؛ نحوّلها إلى نص عند الحاجة
      const v = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
      return [r.key, v.replace(/^"|"$/g, "")];
    })
  );

  const fields: SettingField[] = SETTING_DEFS.map((def) => ({
    ...def,
    value: stored.get(def.key) ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الإعدادات</h2>
        <p className="text-sm text-muted-foreground">
          إعدادات المتجر العامة، صفحة من نحن، ومعلومات التواصل. مفاتيح المزوّدات
          الخارجية (Stripe...) تبقى في متغيّرات البيئة لأسباب أمنية.
        </p>
      </div>
      <SettingsForm fields={fields} />
    </div>
  );
}
