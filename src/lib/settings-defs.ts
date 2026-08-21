export interface SettingDef {
  key: string;
  label: string;
  group: string;
  type?: "text" | "textarea" | "boolean";
  help?: string;
}

/**
 * القائمة الوحيدة والحصرية لمفاتيح الإعدادات المسموح بها. تُستخدم في
 * مكانين: عرض النموذج (admin/settings/page.tsx) والتحقق الفعلي عند
 * الحفظ (admin/settings/actions.ts) - نفس المصدر لكليهما يمنع أي احتمال
 * لتعارض بينهما.
 *
 * ملاحظة أمنية: saveSettings() كانت سابقاً تكتب أي مفتاح setting_<x> يصل
 * ضمن FormData بلا أي تحقق مقابل هذه القائمة - أي طلب POST مباشر لهذا
 * الـServer Action (وليس فقط عبر النموذج المعروض في الواجهة) كان يستطيع
 * كتابة مفاتيح غير مقصودة في جدول Setting. الآن تُرفض أي مفاتيح خارج
 * هذه القائمة صراحة.
 */
export const SETTING_DEFS: SettingDef[] = [
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

export const VALID_SETTING_KEYS = new Set(SETTING_DEFS.map((d) => d.key));
