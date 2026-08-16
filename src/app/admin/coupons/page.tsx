import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { CouponManager } from "@/components/admin/coupon-manager";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "نسبة مئوية",
  FIXED: "قيمة ثابتة",
  FREE_SHIPPING: "شحن مجاني",
};

export default async function AdminCouponsPage() {
  await requirePermission(PERMISSIONS.COUPONS_MANAGE);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">العروض والكوبونات</h2>

      <CouponManager />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr>
              <th className="p-3 text-start">الكود</th>
              <th className="p-3 text-start">النوع</th>
              <th className="p-3 text-start">القيمة</th>
              <th className="p-3 text-start">الاستخدام</th>
              <th className="p-3 text-start">الانتهاء</th>
              <th className="p-3 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-mono font-medium">{c.code}</td>
                <td className="p-3">{TYPE_LABELS[c.type]}</td>
                <td className="p-3">
                  {c.type === "PERCENTAGE"
                    ? `${Number(c.value)}%`
                    : c.type === "FIXED"
                      ? formatPrice(Number(c.value), "TRY", "ar")
                      : "—"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="p-3 text-muted-foreground">
                  {c.expiresAt ? formatDate(c.expiresAt, "ar") : "—"}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      c.isActive
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.isActive ? "فعّال" : "متوقف"}
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
