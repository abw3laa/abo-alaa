import type { Metadata } from "next";
import { Suspense } from "react";
import { queryProducts, getFilterOptions } from "@/lib/queries/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { ProductSort } from "@/components/product/product-sort";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "جميع المنتجات",
  description: "تصفّح جميع منتجات متجر أبو علاء مع فلاتر متقدمة",
};

function parseNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const { products, total, page, totalPages } = await queryProducts({
    category: sp.category,
    brand: sp.brand,
    color: sp.color,
    size: sp.size,
    gender: sp.gender,
    minPrice: parseNum(sp.minPrice),
    maxPrice: parseNum(sp.maxPrice),
    minRating: parseNum(sp.minRating),
    onSale: sp.onSale === "1",
    inStock: sp.inStock === "1",
    search: sp.q,
    sort: sp.sort,
    page: parseNum(sp.page) ?? 1,
  });

  const filterOptions = await getFilterOptions();

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">جميع المنتجات</h1>
        <p className="text-sm text-muted-foreground">{total} منتج</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* الفلاتر - جانبية على الحاسوب */}
        <aside className="hidden md:block">
          <Suspense fallback={null}>
            <ProductFilters
              categories={filterOptions.categories}
              brands={filterOptions.brands}
              colors={filterOptions.colors}
              sizes={filterOptions.sizes}
            />
          </Suspense>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              عرض {products.length} من {total}
            </p>
            <Suspense fallback={null}>
              <ProductSort />
            </Suspense>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="لا توجد منتجات مطابقة"
              description="جرّب تعديل الفلاتر أو البحث بكلمات أخرى"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  baseParams={sp}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
