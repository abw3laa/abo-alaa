import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import {
  SettingsForm,
  type SettingField,
} from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

// تعريف الإعدادات القابلة للتحرير من لوحة التحكم
const SETTING_DEFS: Omit<SettingField, "value">[] = [
  { key: "store_name", label: "اسم المتجر", group: "general", type: "text" },
  {
    key: "store_tagline",
    label: "شعار/وصف المتجر",
    group: "general",
    type: "text",
  },
  {
    key: "maintenance_mode",
    label: "وضع الصيانة",
    group: "general",
    type: "boolean",
    help: "عند التفعيل يُعرض للزوار صفحة الصيانة",
  },
  {
    key: "about_title",
    label: "عنوان صفحة من نحن",
    group: "about",
    type: "text",
  },
  {
    key: "about_content",
    label: "محتوى صفحة من نحن",
    group: "about",
    type: "textarea",
    help: "نص تعريفي عن المتجر يظهر في صفحة /about",
  },
  {
    key: "contact_email",
    label: "بريد التواصل",
    group: "contact",
    type: "text",
  },
  {
    key: "contact_phone",
    label: "هاتف التواصل",
    group: "contact",
    type: "text",
  },
  {
    key: "contact_address",
    label: "العنوان",
    group: "contact",
    type: "text",
  },
  {
    key: "social_instagram",
    label: "Instagram",
    group: "social",
    type: "text",
  },
  {
    key: "social_facebook",
    label: "Facebook",
    group: "social",
    type: "text",
  },
  {
    key: "social_whatsapp",
    label: "WhatsApp",
    group: "social",
    type: "text",
  },
  {
    key: "free_shipping_threshold",
    label: "حد الشحن المجاني (ل.ت)",
    group: "shipping",
    type: "text",
    help: "اترك الحقل فارغاً لتعطيل الشحن المجاني",
  },
];

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
