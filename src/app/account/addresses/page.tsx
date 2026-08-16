import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin } from "lucide-react";

export const metadata: Metadata = { title: "العناوين المحفوظة" };

export default async function AddressesPage() {
  const session = await auth();
  const addresses = await prisma.address.findMany({
    where: { userId: session!.user.id },
    orderBy: { isDefault: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">العناوين المحفوظة</h1>
      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="لا توجد عناوين محفوظة"
          description="ستُحفظ عناوينك تلقائياً عند إتمام أول طلب"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{addr.fullName}</p>
                {addr.isDefault && (
                  <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                    افتراضي
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {addr.city}، {addr.street}
                {addr.building ? `، ${addr.building}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">{addr.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
