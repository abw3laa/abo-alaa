import Image from "next/image";
import Link from "next/link";
import type { Product, ProductImage } from "@prisma/client";
import { PriceDisplay } from "./price-display";
import { RatingStars } from "./rating-stars";
import { calcDiscountPercent } from "@/lib/format";

type ProductWithImage = Product & {
  images: ProductImage[];
};

export function ProductCard({ product }: { product: ProductWithImage }) {
  const image = product.images[0];
  const price = Number(product.price);
  const compareAt = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const discount = calcDiscountPercent(price, compareAt);
  const isNew =
    Date.now() - new Date(product.createdAt).getTime() <
    14 * 24 * 60 * 60 * 1000;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-[4/5] overflow-hidden bg-secondary"
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            لا توجد صورة
          </div>
        )}
        {/* الشارات */}
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
              خصم {discount}%
            </span>
          )}
          {isNew && (
            <span className="rounded bg-gold px-2 py-0.5 text-xs font-medium text-gold-foreground">
              جديد
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-medium hover:text-gold">
            {product.name}
          </h3>
        </Link>
        {product.ratingCount > 0 && (
          <RatingStars
            rating={product.ratingAverage}
            count={product.ratingCount}
          />
        )}
        <PriceDisplay
          price={price}
          compareAtPrice={compareAt}
          currency={product.currency}
          className="mt-auto"
        />
      </div>
    </article>
  );
}
