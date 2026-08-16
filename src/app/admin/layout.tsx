import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // حماية لوحة التحكم من الخادم (إضافة إلى middleware)
  try {
    await requireStaff();
  } catch {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="flex min-h-screen bg-secondary/30" dir="rtl">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
