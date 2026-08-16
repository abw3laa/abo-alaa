import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

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
      <h2 className="text-2xl font-bold">التصنيفات</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr>
              <th className="p-3 text-start">الاسم</th>
              <th className="p-3 text-start">التصنيف الأب</th>
              <th className="p-3 text-start">المنتجات</th>
              <th className="p-3 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">
                  {c.parent?.name ?? "— (رئيسي)"}
                </td>
                <td className="p-3">{c._count.products}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      c.isActive
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.isActive ? "مفعّل" : "معطّل"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
