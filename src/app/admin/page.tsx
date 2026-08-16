import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { formatPrice } from "@/lib/format";
import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";

export default async function AdminDashboardPage() {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const [orderAgg, orderCount, customerCount, lowStock, paidAgg] =
    await Promise.all([
      prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { paymentStatus: "PAID" },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
      prisma.order.aggregate({
        _avg: { grandTotal: true },
        where: { paymentStatus: "PAID" },
      }),
    ]);

  const totalSales = Number(orderAgg._sum.grandTotal ?? 0);
  const avgOrder = Number(paidAgg._avg.grandTotal ?? 0);

  const stats = [
    {
      title: "إجمالي المبيعات",
      value: formatPrice(totalSales, "TRY", "ar"),
      icon: DollarSign,
    },
    {
      title: "عدد الطلبات",
      value: orderCount.toString(),
      icon: ShoppingCart,
    },
    {
      title: "عدد العملاء",
      value: customerCount.toString(),
      icon: Users,
    },
    {
      title: "متوسط قيمة الطلب",
      value: formatPrice(avgOrder, "TRY", "ar"),
      icon: DollarSign,
    },
    {
      title: "منتجات منخفضة المخزون",
      value: lowStock.toString(),
      icon: Package,
      alert: lowStock > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">لوحة الإحصائيات</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        الرسوم البيانية التفاعلية والتقارير القابلة للتصدير ستُضاف في المرحلة
        الرابعة.
      </p>
    </div>
  );
}
