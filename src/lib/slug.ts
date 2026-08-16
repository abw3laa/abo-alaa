/** تحويل نص عربي/إنجليزي إلى slug صالح للروابط */
export function slugify(text: string): string {
  const s = text
    .toString()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  // احتياط: إن أصبح الـ slug فارغاً (اسم رموز فقط) نُرجع معرّفاً عشوائياً
  return s || `item-${Math.random().toString(36).slice(2, 8)}`;
}

/** إضافة لاحقة عشوائية لضمان تفرّد الـ slug */
export function uniqueSlug(text: string): string {
  const base = slugify(text);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

