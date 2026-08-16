import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  let counter = 0;
  beforeEach(() => {
    counter++;
  });

  it("يسمح ضمن الحد", () => {
    const key = `test-allow-${counter}`;
    const r1 = rateLimit(key, 3, 60_000);
    const r2 = rateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("يمنع عند تجاوز الحد", () => {
    const key = `test-block-${counter}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("مفاتيح مختلفة مستقلة", () => {
    const a = rateLimit(`key-a-${counter}`, 1, 60_000);
    const b = rateLimit(`key-b-${counter}`, 1, 60_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
