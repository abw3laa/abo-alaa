"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Heart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";

interface Variant {
  id: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  quantity: number;
}

interface ProductPurchaseProps {
  productId: string;
  productName: string;
  price: number;
  currency: string;
  variants: Variant[];
}

export function ProductPurchase({
  productId,
  productName,
  price,
  currency,
  variants,
}: ProductPurchaseProps) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);

  const colors = useMemo(
    () =>
      Array.from(
        new Map(
          variants
            .filter((v) => v.color)
            .map((v) => [v.color, { name: v.color!, hex: v.colorHex }])
        ).values()
      ),
    [variants]
  );
  const sizes = useMemo(
    () =>
      Array.from(new Set(variants.filter((v) => v.size).map((v) => v.size!))),
    [variants]
  );

  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // إيجاد المتغير المطابق للاختيار
  const selectedVariant = useMemo(() => {
    return (
      variants.find(
        (v) =>
          (color ? v.color === color : true) && (size ? v.size === size : true)
      ) ??
      variants[0] ??
      null
    );
  }, [variants, color, size]);

  const stock = selectedVariant?.quantity ?? 0;
  const inStock = stock > 0;

  function handleAdd(buyNow = false) {
    if (!inStock) return;
    addItem({
      productId,
      variantId: selectedVariant?.id ?? null,
      name: productName,
      variantInfo: [color, size].filter(Boolean).join(" / ") || null,
      price,
      currency,
      quantity: qty,
      image: null,
      maxQuantity: stock,
    });
    if (buyNow) {
      router.push("/cart");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {/* الألوان */}
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            اللون: <span className="text-muted-foreground">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.name)}
                aria-pressed={color === c.name}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  color === c.name
                    ? "border-gold bg-gold/10 font-medium"
                    : "hover:border-gold"
                }`}
              >
                <span
                  className="size-4 rounded-full border"
                  style={{ backgroundColor: c.hex ?? "#ccc" }}
                  aria-hidden="true"
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* المقاسات */}
      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            المقاس: <span className="text-muted-foreground">{size}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`min-w-11 rounded-md border px-4 py-2 text-sm ${
                  size === s
                    ? "border-gold bg-gold/10 font-medium"
                    : "hover:border-gold"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* حالة المخزون */}
      <p className={`text-sm ${inStock ? "text-success" : "text-destructive"}`}>
        {inStock
          ? stock <= 5
            ? `الكمية محدودة (${stock} متبقية)`
            : "متوفر في المخزون"
          : "نفد من المخزون"}
      </p>

      {/* الكمية */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">الكمية</span>
        <div className="flex items-center rounded-md border">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex size-10 items-center justify-center hover:bg-accent"
            aria-label="إنقاص الكمية"
            disabled={qty <= 1}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center" aria-live="polite">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="flex size-10 items-center justify-center hover:bg-accent"
            aria-label="زيادة الكمية"
            disabled={qty >= stock}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* أزرار الشراء */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => handleAdd(false)}
          disabled={!inStock}
          className="flex-1 gap-2"
          size="lg"
        >
          {added ? (
            <>
              <Check className="size-5" /> تمت الإضافة
            </>
          ) : (
            <>
              <ShoppingBag className="size-5" /> أضف إلى السلة
            </>
          )}
        </Button>
        <Button
          onClick={() => handleAdd(true)}
          disabled={!inStock}
          variant="gold"
          size="lg"
          className="flex-1"
        >
          اشترِ الآن
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="أضف إلى المفضلة"
          className="size-12"
        >
          <Heart className="size-5" />
        </Button>
      </div>
    </div>
  );
}
