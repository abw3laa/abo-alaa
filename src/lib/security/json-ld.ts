/**
 * تحويل كائن إلى JSON آمن للحقن داخل <script type="application/ld+json">.
 *
 * JSON.stringify() وحدها ليست كافية: إن احتوت أي قيمة نصية داخل الكائن على
 * "</script>" فسيغلق ذلك وسم السكربت مبكراً ويسمح بحقن HTML/JS تالٍ (Stored/
 * Reflected XSS عبر JSON-LD)، خصوصاً حين تأتي القيم من بيانات المستخدم أو
 * قاعدة البيانات (اسم منتج، عنوان مقال...).
 *
 * الحل: نهرب "<" داخل السلسلة الناتجة فقط (لا تغيّر دلالة JSON، فـ"<" ليست
 * محرفاً خاصاً في JSON، لكنها خطيرة داخل HTML/script).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
