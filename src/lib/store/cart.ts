"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantInfo: string | null;
  price: number;
  currency: string;
  quantity: number;
  image: string | null;
  maxQuantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

function sameLine(
  a: { productId: string; variantId: string | null },
  b: { productId: string; variantId: string | null }
) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item)
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + item.quantity,
                        i.maxQuantity
                      ),
                    }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !sameLine(i, { productId, variantId })
          ),
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, { productId, variantId })
              ? {
                  ...i,
                  quantity: Math.max(1, Math.min(quantity, i.maxQuantity)),
                }
              : i
          ),
        })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: "abo-alaa-cart" }
  )
);
