import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { CouponManager } from "@/components/admin/coupon-manager";
import { CouponRow } from "@/components/admin/coupon-row";

export const dynamic = "force-dynamic";

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
              <th className="p-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <CouponRow
                key={c.id}
                coupon={{
                  id: c.id,
                  code: c.code,
                  type: c.type,
                  value: Number(c.value),
                  minOrderAmount: c.minOrderAmount
                    ? Number(c.minOrderAmount)
                    : null,
                  maxUses: c.maxUses,
                  usedCount: c.usedCount,
                  expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
                  isActive: c.isActive,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
