import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { Package, Heart, Award, ShoppingBag } from "lucide-react";

export const metadata: Metadata = { title: "حسابي" };

export default async function AccountPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [orderCount, wishlistCount, user] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, totalSpent: true, createdAt: true },
    }),
  ]);

  const stats = [
    { label: "الطلبات", value: orderCount.toString(), icon: Package },
    { label: "المفضلة", value: wishlistCount.toString(), icon: Heart },
    {
      label: "نقاط الولاء",
      value: (user?.loyaltyPoints ?? 0).toString(),
      icon: Award,
    },
    {
      label: "إجمالي الإنفاق",
      value: formatPrice(Number(user?.totalSpent ?? 0), "TRY", "ar"),
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً، {session!.user.name}</h1>
        <p className="text-muted-foreground">
          إليك ملخّص نشاطك في متجر أبو علاء
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gold/10 text-gold">
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-bold">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">بيانات الحساب</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">الاسم</dt>
            <dd className="font-medium">{session!.user.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">البريد الإلكتروني</dt>
            <dd className="font-medium">{session!.user.email}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
