"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  FileText,
  Truck,
  CreditCard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "لوحة الإحصائيات", icon: LayoutDashboard },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/coupons", label: "العروض والكوبونات", icon: Tag },
  { href: "/admin/content", label: "المحتوى", icon: FileText },
  { href: "/admin/shipping", label: "الشحن", icon: Truck },
  { href: "/admin/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/admin/roles", label: "الصلاحيات", icon: ShieldCheck },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-e bg-background md:block">
      <div className="flex h-16 items-center gap-2 border-b px-6 font-bold">
        <span className="flex size-8 items-center justify-center rounded-md bg-gold text-gold-foreground">
          ع
        </span>
        <span>لوحة التحكم</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
