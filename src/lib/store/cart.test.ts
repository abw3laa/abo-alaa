import { describe, it, expect, beforeEach } from "vitest";
import { useCart } from "@/lib/store/cart";

const sampleItem = {
  productId: "p1",
  variantId: "v1",
  name: "منتج تجريبي",
  variantInfo: "أحمر / M",
  price: 100,
  currency: "TRY",
  quantity: 1,
  image: null,
  maxQuantity: 10,
};

describe("cart store", () => {
  beforeEach(() => {
    useCart.getState().clear();
  });

  it("يضيف منتجاً جديداً", () => {
    useCart.getState().addItem(sampleItem);
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().totalItems()).toBe(1);
  });

  it("يدمج نفس المنتج ويزيد الكمية", () => {
    useCart.getState().addItem(sampleItem);
    useCart.getState().addItem({ ...sampleItem, quantity: 2 });
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().totalItems()).toBe(3);
  });

  it("لا يتجاوز الحد الأقصى للكمية", () => {
    useCart.getState().addItem({ ...sampleItem, quantity: 8 });
    useCart.getState().addItem({ ...sampleItem, quantity: 8 });
    expect(useCart.getState().items[0]!.quantity).toBe(10);
  });

  it("يحسب المجموع الفرعي", () => {
    useCart.getState().addItem({ ...sampleItem, quantity: 2 });
    expect(useCart.getState().subtotal()).toBe(200);
  });

  it("يحذف منتجاً", () => {
    useCart.getState().addItem(sampleItem);
    useCart.getState().removeItem("p1", "v1");
    expect(useCart.getState().items).toHaveLength(0);
  });

  it("يعامل المتغيرات المختلفة كأسطر منفصلة", () => {
    useCart.getState().addItem(sampleItem);
    useCart.getState().addItem({ ...sampleItem, variantId: "v2" });
    expect(useCart.getState().items).toHaveLength(2);
  });

  it("يحدّث الكمية ضمن الحدود", () => {
    useCart.getState().addItem(sampleItem);
    useCart.getState().updateQuantity("p1", "v1", 5);
    expect(useCart.getState().items[0]!.quantity).toBe(5);
    useCart.getState().updateQuantity("p1", "v1", 999);
    expect(useCart.getState().items[0]!.quantity).toBe(10);
    useCart.getState().updateQuantity("p1", "v1", 0);
    expect(useCart.getState().items[0]!.quantity).toBe(1);
  });
});
