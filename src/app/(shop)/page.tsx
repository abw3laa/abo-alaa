import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/product-card";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { TrustBar } from "@/components/home/trust-bar";
import { Newsletter } from "@/components/home/newsletter";

export const revalidate = 3600; // ISR كل ساعة

async function getHomeData() {
  const [featured, newest, banners, categories] = await Promise.all([
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
    prisma.banner.findMany({
      where: { position: "home_hero", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
  ]);
  return { featured, newest, banners, categories };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const { featured, newest, banners, categories } = await getHomeData();

  const slides = banners.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    mobileImage: b.mobileImage,
    link: b.link,
    buttonText: b.buttonText,
  }));

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* البانر الرئيسي المتحرك */}
      <HeroCarousel
        slides={slides}
        fallbackTitle={t("heroTitle")}
        fallbackSubtitle={t("heroSubtitle")}
        fallbackBadge={t("limitedOffers")}
        shopNowLabel={t("shopNow")}
        viewDealsLabel={t("viewDeals")}
      />

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
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-2xl font-bold text-primary">
                {cat.image || cat.icon ? (
                  <Image
                    src={(cat.image ?? cat.icon)!}
                    alt={cat.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  cat.name.charAt(0)
                )}
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
