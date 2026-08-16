import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RolesManager } from "@/components/admin/roles-manager";

export const dynamic = "force-dynamic";

// تسميات عربية للصلاحيات
const PERM_LABELS: Record<string, string> = {
  "products.view": "عرض المنتجات",
  "products.create": "إضافة منتجات",
  "products.update": "تعديل المنتجات",
  "products.delete": "حذف المنتجات",
  "categories.manage": "إدارة التصنيفات",
  "orders.view": "عرض الطلبات",
  "orders.update": "تعديل الطلبات",
  "orders.cancel": "إلغاء الطلبات",
  "orders.refund": "استرداد الطلبات",
  "customers.view": "عرض العملاء",
  "customers.manage": "إدارة العملاء",
  "coupons.manage": "إدارة الكوبونات",
  "content.manage": "إدارة المحتوى",
  "shipping.manage": "إدارة الشحن",
  "payments.view": "عرض المدفوعات",
  "payments.manage": "إدارة المدفوعات",
  "analytics.view": "عرض التحليلات",
  "settings.manage": "إدارة الإعدادات",
  "roles.manage": "إدارة الصلاحيات",
  "audit.view": "عرض سجل التدقيق",
};

export default async function AdminRolesPage() {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  const allPermissions = Object.values(PERMISSIONS);

  // عدد المستخدمين لكل دور
  const grouped = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
    where: { deletedAt: null },
  });
  const counts = new Map(grouped.map((g) => [g.role, g._count]));

  // الصلاحيات المخزّنة في قاعدة البيانات لكل دور
  const stored = await prisma.rolePermission.findMany({
    include: { permission: { select: { key: true } } },
  });
  const storedMap = new Map<string, string[]>();
  for (const rp of stored) {
    const arr = storedMap.get(rp.role) ?? [];
    arr.push(rp.permission.key);
    storedMap.set(rp.role, arr);
  }

  const staffRoles = Object.keys(ROLE_PERMISSIONS).filter(
    (r) => r !== "CUSTOMER"
  ) as UserRole[];

  const roles = staffRoles.map((role) => ({
    role,
    // إن لم توجد صلاحيات مخزّنة نعرض المصفوفة الثابتة الافتراضية
    permissions: storedMap.get(role) ?? ROLE_PERMISSIONS[role],
    userCount: counts.get(role) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الأدوار والصلاحيات</h2>
        <p className="text-sm text-muted-foreground">
          فعّل أو عطّل الصلاحيات لكل دور، وعيّن الأدوار للمستخدمين
        </p>
      </div>
      <RolesManager
        roles={roles}
        allPermissions={allPermissions}
        permLabels={PERM_LABELS}
      />
    </div>
  );
}
