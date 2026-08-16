import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  RETURNED: "مسترجع",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gold/10 text-gold",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  RETURNED: "bg-secondary text-foreground",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.ORDERS_VIEW);
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? 1), 1);
  const perPage = 20;

  const where = {
    deletedAt: null,
    ...(sp.status ? { status: sp.status as OrderStatus } : {}),
    ...(sp.q
      ? {
          OR: [
            { orderNumber: { contains: sp.q, mode: "insensitive" as const } },
            { customerName: { contains: sp.q, mode: "insensitive" as const } },
            { guestPhone: { contains: sp.q } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الطلبات</h2>
        <p className="text-sm text-muted-foreground">{total} طلب</p>
      </div>

      {/* فلاتر */}
      <form className="flex flex-wrap gap-2" action="/admin/orders">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="رقم الطلب / الاسم / الهاتف"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          تصفية
        </Button>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد طلبات"
          description="ستظهر الطلبات هنا عند إنشائها"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr>
                <th className="p-3 text-start">رقم الطلب</th>
                <th className="p-3 text-start">العميل</th>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الإجمالي</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{o.orderNumber}</td>
                  <td className="p-3">{o.customerName}</td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(o.createdAt, "ar")}
                  </td>
                  <td className="p-3">
                    {formatPrice(Number(o.grandTotal), o.currency, "ar")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${STATUS_COLORS[o.status]}`}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-gold hover:underline"
                    >
                      عرض
                    </Link>
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
              <Link href={`/admin/orders?page=${page - 1}`}>السابق</Link>
            </Button>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            صفحة {page} من {Math.ceil(total / perPage)}
          </span>
          {page < Math.ceil(total / perPage) && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/orders?page=${page + 1}`}>التالي</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
