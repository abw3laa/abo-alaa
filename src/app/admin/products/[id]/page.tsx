import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct, type ActionResult } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  // ربط الـ id بالإجراء
  const boundAction = async (prev: ActionResult | null, formData: FormData) => {
    "use server";
    return updateProduct(id, prev, formData);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">تعديل المنتج</h2>
      <ProductForm
        action={boundAction}
        categories={categories}
        brands={brands}
        defaultValues={{
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          price: Number(product.price),
          compareAtPrice: product.compareAtPrice
            ? Number(product.compareAtPrice)
            : null,
          cost: product.cost ? Number(product.cost) : null,
          sku: product.sku,
          material: product.material,
          brandId: product.brandId,
          status: product.status,
          isFeatured: product.isFeatured,
        }}
        submitLabel="حفظ التغييرات"
      />
    </div>
  );
}
