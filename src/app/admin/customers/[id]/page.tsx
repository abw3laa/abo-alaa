import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { CustomerBanControl } from "@/components/admin/customer-ban-control";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const { id } = await params;
  const canManage = await hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: true },
      },
      _count: { select: { orders: true, reviews: true } },
    },
  });

  if (!customer || customer.role !== "CUSTOMER") notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{customer.name ?? "عميل"}</h2>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-semibold">البيانات</h3>
            <dl className="space-y-2 text-sm">
              <Row label="البريد" value={customer.email} />
              <Row label="الهاتف" value={customer.phone ?? "—"} />
              <Row
                label="إجمالي الإنفاق"
                value={formatPrice(Number(customer.totalSpent), "TRY", "ar")}
              />
              <Row label="عدد الطلبات" value={String(customer._count.orders)} />
              <Row label="نقاط الولاء" value={String(customer.loyaltyPoints)} />
              <Row label="انضم" value={formatDate(customer.createdAt, "ar")} />
            </dl>
          </div>

          {canManage && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-semibold">إدارة الحساب</h3>
              <CustomerBanControl
                userId={customer.id}
                isBanned={customer.isBanned}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 font-semibold">آخر الطلبات</h3>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
          ) : (
            <div className="space-y-2">
              {customer.orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex justify-between rounded-md border p-3 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{o.orderNumber}</span>
                  <span>
                    {formatPrice(Number(o.grandTotal), o.currency, "ar")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
