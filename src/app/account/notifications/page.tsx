import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { Bell } from "lucide-react";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const user = await requireUserOrRedirect();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="لا توجد إشعارات"
        description="ستظهر هنا تحديثات طلباتك والعروض"
      />
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">الإشعارات</h1>
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`rounded-lg border p-4 ${n.isRead ? "bg-card" : "bg-gold/5"}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{n.title}</h2>
            <span className="text-xs text-muted-foreground">
              {formatDate(n.createdAt, "ar")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
        </div>
      ))}
    </div>
  );
}
