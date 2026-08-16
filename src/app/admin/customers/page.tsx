import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? 1), 1);
  const perPage = 20;

  const where = {
    role: "CUSTOMER" as const,
    deletedAt: null,
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" as const } },
            { email: { contains: sp.q, mode: "insensitive" as const } },
            { phone: { contains: sp.q } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">العملاء</h2>
        <p className="text-sm text-muted-foreground">{total} عميل</p>
      </div>

      <form className="flex gap-2" action="/admin/customers">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="ابحث بالاسم أو البريد أو الهاتف"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          بحث
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد عملاء" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr>
                <th className="p-3 text-start">الاسم</th>
                <th className="p-3 text-start">البريد</th>
                <th className="p-3 text-start">الطلبات</th>
                <th className="p-3 text-start">الإنفاق</th>
                <th className="p-3 text-start">انضم</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium hover:text-gold"
                    >
                      {c.name ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.email}</td>
                  <td className="p-3">{c._count.orders}</td>
                  <td className="p-3">
                    {formatPrice(Number(c.totalSpent), "TRY", "ar")}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(c.createdAt, "ar")}
                  </td>
                  <td className="p-3">
                    {c.isBanned ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                        محظور
                      </span>
                    ) : (
                      <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">
                        نشط
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > perPage && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/customers?page=${page - 1}`}>السابق</Link>
            </Button>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            صفحة {page} من {Math.ceil(total / perPage)}
          </span>
          {page < Math.ceil(total / perPage) && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/customers?page=${page + 1}`}>التالي</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
