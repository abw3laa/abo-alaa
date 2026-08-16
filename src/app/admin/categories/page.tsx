import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameEn: c.nameEn,
          parentId: c.parentId,
          parentName: c.parent?.name ?? null,
          image: c.image,
          icon: c.icon,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
