import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "طلباتي" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  RETURNED: "مسترجع",
};

export default async function OrdersPage() {
  const session = await auth();
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id, deletedAt: null },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="لا توجد طلبات بعد"
        description="ابدأ التسوّق واطلب أول منتجاتك"
        action={
          <Button asChild>
            <Link href="/products">تسوّق الآن</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">طلباتي</h1>
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.createdAt, "ar")}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {order.items.length} منتج
            </span>
            <span className="font-bold">
              {formatPrice(Number(order.grandTotal), order.currency, "ar")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
