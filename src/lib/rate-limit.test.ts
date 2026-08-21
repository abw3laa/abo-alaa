import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

// لا يوجد REDIS_URL في بيئة الاختبار، لذا يعمل هذا الاختبار على خطة
// الذاكرة البديلة، وهي كافية للتحقق من منطق العدّ والحدود.
describe("rateLimit", () => {
  let counter = 0;
  beforeEach(() => {
    counter++;
  });

  it("يسمح ضمن الحد", async () => {
    const key = `test-allow-${counter}`;
    const r1 = await rateLimit(key, 3, 60_000);
    const r2 = await rateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("يمنع عند تجاوز الحد", async () => {
    const key = `test-block-${counter}`;
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("مفاتيح مختلفة مستقلة", async () => {
    const a = await rateLimit(`key-a-${counter}`, 1, 60_000);
    const b = await rateLimit(`key-b-${counter}`, 1, 60_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
