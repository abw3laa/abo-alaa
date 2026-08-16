import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// توليد ديناميكي لتفادي الحاجة لقاعدة البيانات وقت البناء
export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticPages = [
    "",
    "/products",
    "/deals",
    "/blog",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/returns",
    "/shipping",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const [products, categories, posts] = await Promise.all([
    prisma.product
      .findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
        take: 5000,
      })
      .catch(() => []),
    prisma.category
      .findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.blogPost
      .findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const productUrls = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((c) => ({
    url: `${base}/categories/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const postUrls = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...productUrls, ...categoryUrls, ...postUrls];
}
