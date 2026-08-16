import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { Plus, Package } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "منشور",
  DRAFT: "مسودة",
  ARCHIVED: "مؤرشف",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? 1), 1);
  const perPage = 20;

  const where = {
    deletedAt: null,
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" as const } },
            { sku: { contains: sp.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        variants: { include: { inventory: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">المنتجات</h2>
          <p className="text-sm text-muted-foreground">{total} منتج</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            منتج جديد
          </Link>
        </Button>
      </div>

      {/* البحث */}
      <form className="flex gap-2" action="/admin/products">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="ابحث بالاسم أو SKU"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          بحث
        </Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد منتجات"
          description="أنشئ أول منتج للبدء"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-start">
              <tr>
                <th className="p-3 text-start">المنتج</th>
                <th className="p-3 text-start">SKU</th>
                <th className="p-3 text-start">السعر</th>
                <th className="p-3 text-start">المخزون</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce(
                  (s, v) => s + (v.inventory?.quantity ?? 0),
                  0
                );
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-medium hover:text-gold"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {p.sku ?? "—"}
                    </td>
                    <td className="p-3">
                      {formatPrice(Number(p.price), p.currency, "ar")}
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          stock === 0
                            ? "text-destructive"
                            : stock <= 5
                              ? "text-gold"
                              : ""
                        }
                      >
                        {stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-gold hover:underline"
                        >
                          تعديل
                        </Link>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ترقيم بسيط */}
      {total > perPage && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/products?page=${page - 1}`}>السابق</Link>
            </Button>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            صفحة {page} من {Math.ceil(total / perPage)}
          </span>
          {page < Math.ceil(total / perPage) && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/products?page=${page + 1}`}>التالي</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
