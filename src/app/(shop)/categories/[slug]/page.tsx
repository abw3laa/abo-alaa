import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { queryProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductSort } from "@/components/product/product-sort";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, seoTitle: true, seoDescription: true },
  });
  if (!category) return { title: "القسم غير موجود" };
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
  });
  if (!category) notFound();

  const page = sp.page ? Number(sp.page) : 1;
  const { products, total, totalPages } = await queryProducts({
    category: slug,
    sort: sp.sort,
    page,
  });

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-1 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{total} منتج</p>
      </div>

      <div className="mb-4 flex justify-end">
        <Suspense fallback={null}>
          <ProductSort />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات في هذا القسم"
          description="تصفّح أقساماً أخرى أو عد لاحقاً"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
  );
}
