import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير عام",
  ADMIN: "مدير",
  MANAGER: "مشرف",
  PRODUCT_MANAGER: "مدير منتجات",
  ORDER_MANAGER: "مدير طلبات",
  CONTENT_EDITOR: "محرّر محتوى",
  CUSTOMER_SUPPORT: "دعم العملاء",
  ANALYST: "محلّل",
  CUSTOMER: "عميل",
};

export default async function AdminRolesPage() {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  // عدد المستخدمين لكل دور
  const grouped = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
    where: { deletedAt: null },
  });
  const counts = new Map(grouped.map((g) => [g.role, g._count]));

  const staffRoles = Object.keys(ROLE_PERMISSIONS).filter(
    (r) => r !== "CUSTOMER"
  ) as UserRole[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الأدوار والصلاحيات</h2>
        <p className="text-sm text-muted-foreground">
          الصلاحيات مطبّقة من الخادم على كل عملية إدارية
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {staffRoles.map((role) => (
          <div key={role} className="rounded-lg border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{ROLE_LABELS[role]}</h3>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                {counts.get(role) ?? 0} مستخدم
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PERMISSIONS[role].map((perm) => (
                <span
                  key={perm}
                  className="rounded bg-gold/10 px-2 py-0.5 text-xs text-gold"
                >
                  {perm}
                </span>
              ))}
              {ROLE_PERMISSIONS[role].length === 0 && (
                <span className="text-xs text-muted-foreground">
                  لا صلاحيات
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
