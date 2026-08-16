"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/format";

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 30;
const TAX_RATE = 0.1;

export function CartView() {
  const items = useCart((s) => s.items);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const subtotal = useCart((s) => s.subtotal());

  // تفادي اختلاف SSR/CSR مع التخزين المحلي
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="سلتك فارغة"
        description="لم تقم بإضافة أي منتجات بعد"
        action={
          <Button asChild>
            <Link href="/products">متابعة التسوق</Link>
          </Button>
        }
      />
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* قائمة المنتجات */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId}`}
            className="flex gap-4 rounded-lg border p-4"
          >
            <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">
              {item.name.charAt(0)}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="font-medium">{item.name}</h3>
              {item.variantInfo && (
                <p className="text-sm text-muted-foreground">
                  {item.variantInfo}
                </p>
              )}
              <p className="font-bold text-primary">
                {formatPrice(item.price, item.currency, "ar")}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-md border">
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.variantId,
                        item.quantity - 1
                      )
                    }
                    className="flex size-9 items-center justify-center hover:bg-accent"
                    aria-label="إنقاص"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.variantId,
                        item.quantity + 1
                      )
                    }
                    className="flex size-9 items-center justify-center hover:bg-accent"
                    aria-label="زيادة"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="flex items-center gap-1 text-sm text-destructive hover:underline"
                >
                  <Trash2 className="size-4" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ملخص الطلب */}
      <aside className="h-fit space-y-4 rounded-lg border p-5">
        <h2 className="font-semibold">ملخص الطلب</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المجموع الفرعي</dt>
            <dd>{formatPrice(subtotal, "TRY", "ar")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الشحن</dt>
            <dd>
              {shipping === 0 ? (
                <span className="text-success">مجاني</span>
              ) : (
                formatPrice(shipping, "TRY", "ar")
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الضريبة</dt>
            <dd>{formatPrice(tax, "TRY", "ar")}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd>{formatPrice(total, "TRY", "ar")}</dd>
          </div>
        </dl>

        {subtotal < FREE_SHIPPING_THRESHOLD && (
          <p className="rounded-md bg-gold/10 p-2 text-xs text-gold">
            أضف {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal, "TRY", "ar")}{" "}
            للحصول على شحن مجاني
          </p>
        )}

        <Button asChild className="w-full" size="lg">
          <Link href="/checkout">المتابعة إلى الدفع</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/products">متابعة التسوق</Link>
        </Button>
      </aside>
    </div>
  );
}
