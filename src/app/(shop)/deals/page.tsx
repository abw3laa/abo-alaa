import type { Metadata } from "next";
import { queryProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "العروض والتخفيضات",
  description: "أفضل العروض والمنتجات المخفّضة في متجر أبو علاء",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { products, total } = await queryProducts({
    onSale: true,
    sort: sp.sort ?? "newest",
    perPage: 24,
  });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-destructive">
          العروض والتخفيضات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} منتج مخفّض</p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="لا توجد عروض حالياً"
          description="تابعنا للاطلاع على أحدث التخفيضات"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
