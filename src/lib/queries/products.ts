import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ProductQueryParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  gender?: string;
  minRating?: number;
  inStock?: boolean;
  onSale?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const SORT_MAP: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  priceLow: { price: "asc" },
  priceHigh: { price: "desc" },
  bestSelling: { salesCount: "desc" },
  topRated: { ratingAverage: "desc" },
  mostViewed: { viewCount: "desc" },
};

/**
 * استعلام موحّد للمنتجات مع الفلاتر والترتيب والصفحات.
 * يُستخدم في صفحة المنتجات والبحث والتصنيفات.
 */
export async function queryProducts(params: ProductQueryParams) {
  const perPage = Math.min(params.perPage ?? 12, 48);
  const page = Math.max(params.page ?? 1, 1);

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (params.category) {
    where.categories = {
      some: { category: { slug: params.category } },
    };
  }
  if (params.brand) {
    where.brand = { slug: params.brand };
  }
  if (params.gender) {
    where.gender = params.gender as Prisma.ProductWhereInput["gender"];
  }
  if (params.minPrice != null || params.maxPrice != null) {
    where.price = {};
    if (params.minPrice != null) where.price.gte = params.minPrice;
    if (params.maxPrice != null) where.price.lte = params.maxPrice;
  }
  if (params.minRating != null) {
    where.ratingAverage = { gte: params.minRating };
  }
  if (params.onSale) {
    where.compareAtPrice = { not: null };
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
      { barcode: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.color || params.size || params.inStock) {
    where.variants = {
      some: {
        ...(params.color ? { color: params.color } : {}),
        ...(params.size ? { size: params.size } : {}),
        ...(params.inStock ? { inventory: { quantity: { gt: 0 } } } : {}),
      },
    };
  }

  const orderBy = SORT_MAP[params.sort ?? "newest"] ?? SORT_MAP.newest;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/** جلب خيارات الفلاتر المتاحة (تصنيفات، ماركات، ألوان، مقاسات) */
export async function getFilterOptions() {
  const [categories, brands, variants] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    prisma.productVariant.findMany({
      select: { color: true, colorHex: true, size: true },
    }),
  ]);

  const colors = Array.from(
    new Map(
      variants
        .filter((v) => v.color)
        .map((v) => [v.color, { name: v.color!, hex: v.colorHex }])
    ).values()
  );
  const sizes = Array.from(
    new Set(variants.filter((v) => v.size).map((v) => v.size!))
  );

  return { categories, brands, colors, sizes };
}
