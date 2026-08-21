/**
 * التحقق من التوقيع الحقيقي للملف (Magic Bytes) وليس فقط Content-Type
 * المُعلَن من العميل. Content-Type وحده قابل للتزوير بسهولة (ملف HTML/SVG
 * بامتداد ومحتوى مختلف عن ما يدّعيه)، وهذا هو أساس هجمات رفع الملفات
 * (Polyglot files, MIME confusion).
 */
const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  "image/gif": (b) =>
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp": (b) =>
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
  "image/avif": (b) =>
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70 && // "ftyp"
    // ftyp brand for avif/avis - check bytes 8-11 loosely
    (b[8] === 0x61 || b[9] === 0x61), // 'a...' avif/avis brand family
  "video/mp4": (b) =>
    b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70, // "ftyp"
  "video/quicktime": (b) =>
    b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  "video/webm": (b) =>
    b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3, // EBML header
};

/** لا نسمح مطلقاً بهذه الأنواع بغض النظر عن أي Content-Type مُعلَن */
const HARD_BLOCKLIST = [
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
  "application/x-javascript",
  "text/javascript",
  "application/javascript",
];

export interface SignatureCheckResult {
  ok: boolean;
  reason?: string;
}

export function verifyFileSignature(
  declaredContentType: string,
  headerBytes: Uint8Array
): SignatureCheckResult {
  const type = declaredContentType.toLowerCase().split(";")[0].trim();

  if (HARD_BLOCKLIST.includes(type)) {
    return { ok: false, reason: "نوع ملف غير مسموح به" };
  }

  const check = SIGNATURES[type];
  if (!check) {
    // نوع غير معروف لدينا بالكامل - نرفض بدل قبوله بحسن نية
    return { ok: false, reason: "تعذّر التحقق من نوع الملف" };
  }

  try {
    if (!check(headerBytes)) {
      return {
        ok: false,
        reason: "محتوى الملف الفعلي لا يطابق نوعه المُعلَن",
      };
    }
  } catch {
    return { ok: false, reason: "تعذّر التحقق من نوع الملف" };
  }

  return { ok: true };
}
