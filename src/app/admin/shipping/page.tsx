import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  await requirePermission(PERMISSIONS.SHIPPING_MANAGE);

  const carriers = await prisma.shippingCarrier.findMany({
    include: { zones: true },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">الشحن</h2>
      {carriers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="لا توجد شركات شحن"
          description="أضف شركات ومناطق الشحن لإدارة التوصيل"
        />
      ) : (
        <div className="space-y-4">
          {carriers.map((carrier) => (
            <div key={carrier.id} className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-semibold">{carrier.name}</h3>
              <div className="space-y-2">
                {carrier.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex justify-between rounded-md border p-3 text-sm"
                  >
                    <span>{zone.name}</span>
                    <span className="text-muted-foreground">
                      {formatPrice(Number(zone.baseCost), "TRY", "ar")} ·{" "}
                      {zone.estimatedDaysMin}-{zone.estimatedDaysMax} يوم
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
