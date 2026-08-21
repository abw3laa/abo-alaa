import DOMPurify from "isomorphic-dompurify";

/**
 * تنظيف HTML قادم من محرر محتوى (مقالات المدونة، صفحات CMS...) قبل تخزينه
 * وقبل عرضه (طبقتا حماية مستقلتان - Defense in Depth).
 *
 * هذا يحمي من Stored XSS حتى لو كان المصدر "موظف موثوق"، لأن:
 * - قد يُخترق حساب الموظف
 * - قد يحتوي المحرر نفسه على ثغرة تسمح بحقن HTML خام
 * - قد تُضاف مسارات كتابة أخرى مستقبلاً دون المرور بهذا التحقق
 *
 * لا نعتمد على Content-Security-Policy كبديل عن هذا التنظيف؛ فهي طبقة إضافية
 * فقط ولا تمنع XSS من عناصر HTML يسمح بها الموقع نفسه.
 */
export function sanitizeContentHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "code",
      "pre",
      "img",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "span",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    // يمنع javascript: و data: و vbscript: في href/src
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // إزالة الوسوم "الخام" المهجورة كالسماح فقط بما هو مذكور أعلاه
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
  });
}
