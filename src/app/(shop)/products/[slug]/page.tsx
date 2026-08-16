import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, calcDiscountPercent } from "@/lib/format";
import { RatingStars } from "@/components/product/rating-stars";
import { ProductCard } from "@/components/product/product-card";
import { ProductPurchase } from "@/components/product/product-purchase";
import { Truck, RotateCcw, ShieldCheck } from "lucide-react";

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      videos: true,
      brand: true,
      categories: { include: { category: true } },
      variants: { include: { inventory: true } },
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      name: true,
      seoTitle: true,
      seoDescription: true,
      shortDescription: true,
    },
  });
  if (!product) return { title: "المنتج غير موجود" };
  return {
    title: product.seoTitle ?? product.name,
    description:
      product.seoDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // زيادة عداد المشاهدات (دون انتظار)
  prisma.product
    .update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  const price = Number(product.price);
  const compareAt = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const discount = calcDiscountPercent(price, compareAt);

  const totalStock = product.variants.reduce(
    (sum, v) => sum + (v.inventory?.quantity ?? 0),
    0
  );

  // منتجات مشابهة من نفس التصنيف
  const categoryIds = product.categories.map((c) => c.categoryId);
  const related = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      id: { not: product.id },
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 4,
  });

  // بيانات Schema.org
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.shortDescription ?? product.name,
    sku: product.sku ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: product.currency,
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      product.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          }
        : undefined,
  };

  return (
    <div className="container py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* مسار التنقل */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="مسار">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-gold">
              الرئيسية
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className="hover:text-gold">
              المنتجات
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* معرض الصور */}
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border bg-secondary">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                لا توجد صورة
              </div>
            )}
            {discount > 0 && (
              <span className="absolute start-3 top-3 rounded bg-destructive px-2 py-1 text-sm font-medium text-destructive-foreground">
                خصم {discount}%
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-md border bg-secondary"
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? product.name}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* التفاصيل والشراء */}
        <div className="space-y-5">
          <div>
            {product.brand && (
              <Link
                href={`/products?brand=${product.brand.slug}`}
                className="text-sm text-gold hover:underline"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {product.name}
            </h1>
          </div>

          {product.ratingCount > 0 && (
            <RatingStars
              rating={product.ratingAverage}
              count={product.ratingCount}
              size="md"
            />
          )}

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(price, product.currency, "ar")}
            </span>
            {compareAt && discount > 0 && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(compareAt, product.currency, "ar")}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          {/* اختيار المتغيرات والشراء (Client) */}
          <ProductPurchase
            productId={product.id}
            productName={product.name}
            price={price}
            currency={product.currency}
            variants={product.variants.map((v) => ({
              id: v.id,
              color: v.color,
              colorHex: v.colorHex,
              size: v.size,
              quantity: v.inventory?.quantity ?? 0,
            }))}
          />

          {/* شريط الثقة */}
          <div className="grid grid-cols-3 gap-3 border-t pt-4 text-center text-xs">
            <div className="flex flex-col items-center gap-1">
              <Truck className="size-5 text-gold" />
              شحن سريع
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="size-5 text-gold" />
              استرجاع 14 يوماً
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="size-5 text-gold" />
              دفع آمن
            </div>
          </div>
        </div>
      </div>

      {/* الوصف الكامل والمواصفات */}
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold">الوصف</h2>
          <p className="whitespace-pre-line text-muted-foreground">
            {product.description ?? product.shortDescription}
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-bold">المواصفات</h2>
          <dl className="space-y-2 text-sm">
            {product.material && (
              <SpecRow label="الخامة" value={product.material} />
            )}
            {product.sku && <SpecRow label="رقم المنتج" value={product.sku} />}
            {product.careInstructions && (
              <SpecRow label="العناية" value={product.careInstructions} />
            )}
          </dl>
        </div>
      </div>

      {/* المراجعات */}
      {product.reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">
            المراجعات ({product.ratingCount})
          </h2>
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {review.user.name ?? "عميل"}
                  </span>
                  <RatingStars rating={review.rating} />
                </div>
                {review.title && (
                  <p className="mt-2 font-medium">{review.title}</p>
                )}
                {review.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
