import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { ShippingManager } from "@/components/admin/shipping-manager";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  await requirePermission(PERMISSIONS.SHIPPING_MANAGE);

  const [carriers, recentShipments] = await Promise.all([
    prisma.shippingCarrier.findMany({
      include: { zones: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { order: { select: { orderNumber: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">الشحن</h2>

      <ShippingManager
        carriers={carriers.map((c) => ({
          id: c.id,
          name: c.name,
          isActive: c.isActive,
          zones: c.zones.map((z) => ({
            id: z.id,
            carrierId: z.carrierId,
            name: z.name,
            countries: z.countries,
            baseCost: Number(z.baseCost),
            perKgCost: Number(z.perKgCost),
            freeOver: z.freeOver ? Number(z.freeOver) : null,
            estimatedDaysMin: z.estimatedDaysMin,
            estimatedDaysMax: z.estimatedDaysMax,
            isExpress: z.isExpress,
            isActive: z.isActive,
          })),
        }))}
      />

      {/* الشحنات الحالية والسابقة */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">آخر الشحنات</h3>
        {recentShipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد شحنات بعد</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/50">
                <tr>
                  <th className="p-3 text-start">الطلب</th>
                  <th className="p-3 text-start">شركة الشحن</th>
                  <th className="p-3 text-start">رقم التتبع</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentShipments.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{s.order.orderNumber}</td>
                    <td className="p-3 text-muted-foreground">
                      {s.carrier ?? "—"}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {s.trackingUrl ? (
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          {s.trackingNumber ?? "تتبّع"}
                        </a>
                      ) : (
                        (s.trackingNumber ?? "—")
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{s.status}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(s.createdAt, "ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
