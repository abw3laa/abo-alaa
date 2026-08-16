import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "معلّق",
  PAID: "مدفوع",
  FAILED: "فاشل",
  REFUNDED: "مُسترد",
  PARTIALLY_REFUNDED: "مُسترد جزئياً",
};

export default async function AdminPaymentsPage() {
  await requirePermission(PERMISSIONS.PAYMENTS_VIEW);

  const payments = await prisma.payment.findMany({
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">المدفوعات</h2>
      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="لا توجد مدفوعات" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr>
                <th className="p-3 text-start">الطلب</th>
                <th className="p-3 text-start">المزوّد</th>
                <th className="p-3 text-start">المبلغ</th>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.order.orderNumber}</td>
                  <td className="p-3 uppercase text-muted-foreground">
                    {p.provider}
                  </td>
                  <td className="p-3">
                    {formatPrice(Number(p.amount), p.currency, "ar")}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(p.createdAt, "ar")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        p.status === "PAID"
                          ? "bg-success/10 text-success"
                          : p.status === "FAILED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
