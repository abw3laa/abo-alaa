import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const [categories, brands] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">منتج جديد</h2>
      <ProductForm
        action={createProduct}
        categories={categories}
        brands={brands}
        submitLabel="إنشاء المنتج"
      />
    </div>
  );
}
