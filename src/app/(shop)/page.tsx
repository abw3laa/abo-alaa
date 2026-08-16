import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/product-card";
import { TrustBar } from "@/components/home/trust-bar";
import { Newsletter } from "@/components/home/newsletter";

export const revalidate = 3600; // ISR كل ساعة

async function getHomeData() {
  const [featured, newest, banner, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED", isFeatured: true, deletedAt: null },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.banner.findFirst({
      where: { position: "home_hero", isActive: true },
    }),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
  ]);
  return { featured, newest, banner, categories };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const { featured, newest, banner, categories } = await getHomeData();

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* البانر الرئيسي */}
      <section
        className="relative overflow-hidden bg-primary text-primary-foreground"
        aria-label={t("heroTitle")}
      >
        <div className="container flex min-h-[420px] flex-col items-start justify-center gap-6 py-16">
          <span className="rounded-full bg-gold px-4 py-1 text-sm font-medium text-gold-foreground">
            {banner?.subtitle ?? t("limitedOffers")}
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
            {banner?.title ?? t("heroTitle")}
          </h1>
          <p className="max-w-xl text-lg text-primary-foreground/80">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/products">{t("shopNow")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/deals">{t("viewDeals")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* التصنيفات */}
      <section className="container">
        <h2 className="mb-6 text-2xl font-bold">{t("shopByCategory")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors hover:border-gold hover:bg-accent/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-primary">
                {cat.name.charAt(0)}
              </div>
              <span className="text-sm font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* منتجات مميزة */}
      {featured.length > 0 && (
        <section className="container">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("featuredProducts")}</h2>
            <Button asChild variant="link">
              <Link href="/products">عرض الكل</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* أحدث المنتجات */}
      {newest.length > 0 && (
        <section className="container">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("newProducts")}</h2>
            <Button asChild variant="link">
              <Link href="/products?sort=newest">عرض الكل</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <TrustBar />
      <Newsletter />
    </div>
  );
}
