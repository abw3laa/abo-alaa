import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = { title: "طرق الدفع" };

export default async function PaymentMethodsPage() {
  const user = await requireUserOrRedirect();
  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: user.id },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">طرق الدفع</h1>
      {methods.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="لا توجد طرق دفع محفوظة"
          description="لا نخزّن بيانات بطاقتك؛ تتم المعالجة بأمان عبر مزوّد الدفع"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
            >
              <CreditCard className="size-6 text-gold" />
              <div>
                <p className="font-medium">
                  {m.brand ?? "بطاقة"} •••• {m.last4 ?? "0000"}
                </p>
                {m.expMonth && m.expYear && (
                  <p className="text-xs text-muted-foreground">
                    تنتهي {m.expMonth}/{m.expYear}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
