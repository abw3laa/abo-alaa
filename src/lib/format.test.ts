import { describe, it, expect } from "vitest";
import { formatPrice, calcDiscountPercent } from "@/lib/format";

describe("formatPrice", () => {
  it("ينسّق السعر بالليرة التركية", () => {
    const result = formatPrice(100, "TRY", "ar");
    expect(result).toContain("100");
  });

  it("يتعامل مع النص كمدخل", () => {
    const result = formatPrice("250.5", "USD", "en");
    expect(result).toContain("250");
  });
});

describe("calcDiscountPercent", () => {
  it("يحسب نسبة الخصم الصحيحة", () => {
    expect(calcDiscountPercent(80, 100)).toBe(20);
  });

  it("يرجع صفراً عند عدم وجود سعر مقارنة", () => {
    expect(calcDiscountPercent(100, null)).toBe(0);
  });

  it("يرجع صفراً إذا كان سعر المقارنة أقل", () => {
    expect(calcDiscountPercent(100, 80)).toBe(0);
  });
});
