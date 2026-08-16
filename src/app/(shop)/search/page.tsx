import type { Metadata } from "next";
import { queryProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductSort } from "@/components/product/product-sort";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { Suspense } from "react";

export const metadata: Metadata = { title: "نتائج البحث" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const query = sp.q ?? "";

  const { products, total } = query
    ? await queryProducts({ search: query, sort: sp.sort, perPage: 24 })
    : { products: [], total: 0 };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">نتائج البحث</h1>
        {query && (
          <p className="mt-1 text-sm text-muted-foreground">
            {total} نتيجة عن &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {!query ? (
        <EmptyState
          icon={Search}
          title="ابحث عن منتجات"
          description="أدخل كلمة بحث في الأعلى للعثور على منتجات"
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Search}
          title="لا توجد نتائج"
          description={`لم نجد منتجات تطابق "${query}". جرّب كلمات أخرى.`}
        />
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Suspense fallback={null}>
              <ProductSort />
            </Suspense>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
