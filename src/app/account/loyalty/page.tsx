import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Award } from "lucide-react";

export const metadata: Metadata = { title: "نقاط الولاء" };

export default async function LoyaltyPage() {
  const user = await requireUserOrRedirect();
  const [user, ledger] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">نقاط الولاء</h1>
      <div className="rounded-lg border bg-primary p-6 text-primary-foreground">
        <p className="text-sm opacity-80">رصيدك الحالي</p>
        <p className="text-4xl font-bold text-gold">
          {user?.loyaltyPoints ?? 0}
        </p>
        <p className="mt-1 text-sm opacity-80">نقطة</p>
      </div>

      {ledger.length === 0 ? (
        <EmptyState
          icon={Award}
          title="لا توجد حركات بعد"
          description="اكسب نقاطاً مع كل عملية شراء"
        />
      ) : (
        <div className="space-y-2">
          {ledger.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div>
                <p>{entry.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.createdAt, "ar")}
                </p>
              </div>
              <span
                className={
                  entry.points >= 0 ? "text-success" : "text-destructive"
                }
              >
                {entry.points >= 0 ? "+" : ""}
                {entry.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
