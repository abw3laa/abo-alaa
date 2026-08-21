import { describe, it, expect } from "vitest";
import { verifyFileSignature } from "@/lib/security/file-signature";

function bytes(...values: number[]): Uint8Array {
  const arr = new Uint8Array(64);
  arr.set(values);
  return arr;
}

function textBytes(text: string): Uint8Array {
  const arr = new Uint8Array(64);
  const encoded = new TextEncoder().encode(text);
  arr.set(encoded.slice(0, 64));
  return arr;
}

describe("verifyFileSignature", () => {
  // السيناريو الأساسي المطلوب اختباره صراحة: ملف HTML حقيقي (يحتوي وسم
  // <script> قابلاً للتنفيذ) لكن مُعنوناً زوراً على أنه صورة PNG. هذا
  // بالضبط ما يمنعه هذا الفحص - Content-Type وحده كان سيقبله.
  it("يرفض ملف HTML معنوناً زوراً كـ image/png", () => {
    const htmlContent = textBytes(
      "<!DOCTYPE html><script>alert(document.cookie)</script>"
    );
    const result = verifyFileSignature("image/png", htmlContent);
    expect(result.ok).toBe(false);
  });

  it("يرفض SVG بغض النظر عن Content-Type المُعلَن (حظر مطلق)", () => {
    const result = verifyFileSignature("image/svg+xml", textBytes("<svg/>"));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("نوع ملف غير مسموح به");
  });

  it("يرفض text/html صراحة حتى لو حاول التنكر كصورة", () => {
    const result = verifyFileSignature("text/html", textBytes("<html>"));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("نوع ملف غير مسموح به");
  });

  it("يقبل PNG حقيقي بتوقيعه الصحيح", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const result = verifyFileSignature("image/png", png);
    expect(result.ok).toBe(true);
  });

  it("يرفض ملفاً يدّعي أنه PNG لكن بتوقيع مختلف فعلياً", () => {
    // أول 8 بايتات لا تطابق توقيع PNG الحقيقي إطلاقاً
    const fake = bytes(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const result = verifyFileSignature("image/png", fake);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("محتوى الملف الفعلي لا يطابق نوعه المُعلَن");
  });

  it("يقبل JPEG حقيقي بتوقيعه الصحيح", () => {
    const jpeg = bytes(0xff, 0xd8, 0xff);
    const result = verifyFileSignature("image/jpeg", jpeg);
    expect(result.ok).toBe(true);
  });

  it("يرفض JPEG مزعوماً بتوقيع خاطئ", () => {
    const fake = bytes(0x00, 0x01, 0x02);
    const result = verifyFileSignature("image/jpeg", fake);
    expect(result.ok).toBe(false);
  });

  it("يقبل GIF حقيقي بتوقيعه الصحيح", () => {
    const gif = bytes(0x47, 0x49, 0x46, 0x38);
    const result = verifyFileSignature("image/gif", gif);
    expect(result.ok).toBe(true);
  });

  it("يقبل WEBP حقيقي بتوقيعه الصحيح (RIFF....WEBP)", () => {
    const webp = bytes(
      0x52,
      0x49,
      0x46,
      0x46,
      0x00,
      0x00,
      0x00,
      0x00,
      0x57,
      0x45,
      0x42,
      0x50
    );
    const result = verifyFileSignature("image/webp", webp);
    expect(result.ok).toBe(true);
  });

  it("يقبل MP4 حقيقي بتوقيع ftyp", () => {
    const mp4 = bytes(
      0x00,
      0x00,
      0x00,
      0x18,
      0x66,
      0x74,
      0x79,
      0x70 // "ftyp" عند الإزاحة 4
    );
    const result = verifyFileSignature("video/mp4", mp4);
    expect(result.ok).toBe(true);
  });

  it("يرفض نوع Content-Type غير معروف إطلاقاً بدل قبوله بحسن نية", () => {
    const result = verifyFileSignature(
      "application/x-msdownload",
      textBytes("MZ")
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("تعذّر التحقق من نوع الملف");
  });

  it("لا يتأثر بالمسافات/الأحرف الكبيرة في Content-Type", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const result = verifyFileSignature(" IMAGE/PNG ; charset=binary", png);
    expect(result.ok).toBe(true);
  });
});
