import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isStaff } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  Heart,
  Bell,
  Award,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

const menuItems = [
  { href: "/account", label: "الملف الشخصي", icon: User },
  { href: "/account/orders", label: "طلباتي", icon: Package },
  { href: "/account/addresses", label: "العناوين", icon: MapPin },
  { href: "/account/payment-methods", label: "طرق الدفع", icon: CreditCard },
  { href: "/account/wishlist", label: "المفضلة", icon: Heart },
  { href: "/account/notifications", label: "الإشعارات", icon: Bell },
  { href: "/account/loyalty", label: "نقاط الولاء", icon: Award },
  { href: "/account/security", label: "الأمان", icon: ShieldCheck },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const staff = isStaff(session.user.role as UserRole);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        تخطّي إلى المحتوى
      </a>
      <Header />
      <main id="main-content" className="container flex-1 py-8">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* الشريط الجانبي */}
          <aside className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-gold/10 text-lg font-bold text-gold">
                  {session.user.name?.charAt(0) ?? "ع"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {session.user.name ?? "عميل"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>

            {staff && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg border bg-primary p-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <LayoutDashboard className="size-5" />
                لوحة التحكم
              </Link>
            )}

            <nav className="rounded-lg border bg-card p-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <item.icon className="size-5 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-start gap-3 text-destructive"
              >
                <LogOut className="size-5" />
                تسجيل الخروج
              </Button>
            </form>
          </aside>

          {/* المحتوى */}
          <section>{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
