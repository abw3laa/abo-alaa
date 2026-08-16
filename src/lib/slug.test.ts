import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("يحوّل النص الإنجليزي", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("يحافظ على الأحرف العربية", () => {
    expect(slugify("قميص قطني")).toBe("قميص-قطني");
  });

  it("يزيل الرموز الخاصة", () => {
    expect(slugify("Test@#$%Product")).toBe("testproduct");
  });

  it("يدمج الشرطات المتكررة", () => {
    expect(slugify("a   b   c")).toBe("a-b-c");
  });
});

describe("uniqueSlug", () => {
  it("يضيف لاحقة فريدة", () => {
    const s1 = uniqueSlug("منتج");
    const s2 = uniqueSlug("منتج");
    expect(s1).not.toBe(s2);
    expect(s1.startsWith("منتج-")).toBe(true);
  });
});
