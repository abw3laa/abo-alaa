import { auth } from "@/lib/auth";
import {
  roleHasPermission,
  isStaff,
  type PermissionKey,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

/**
 * حراسة الصلاحيات على مستوى الخادم.
 * تُستخدم داخل Server Actions و Route Handlers.
 * نتحقق أولاً من الصلاحيات المخزّنة في قاعدة البيانات (RolePermission)
 * ثم نرجع إلى المصفوفة الثابتة كخطة بديلة.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 403
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** التحقق من صلاحية دور من قاعدة البيانات، مع الرجوع للمصفوفة الثابتة */
async function roleHasPermissionDb(
  role: UserRole,
  permission: PermissionKey
): Promise<boolean> {
  // المدير العام يملك كل الصلاحيات دائماً
  if (role === "SUPER_ADMIN") return true;
  try {
    const rp = await prisma.rolePermission.findFirst({
      where: { role, permission: { key: permission } },
      select: { id: true },
    });
    if (rp) return true;
    // إن لم توجد أي صلاحيات مخزّنة لهذا الدور نرجع للمصفوفة الثابتة
    const anyStored = await prisma.rolePermission.count({ where: { role } });
    if (anyStored === 0) return roleHasPermission(role, permission);
    return false;
  } catch {
    // في حال فشل قاعدة البيانات نعتمد المصفوفة الثابتة
    return roleHasPermission(role, permission);
  }
}

/** إرجاع المستخدم الحالي أو رمي خطأ إن لم يكن مسجلاً */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("يجب تسجيل الدخول", 401);
  }
  return session.user;
}

/** يتطلب أن يكون المستخدم من طاقم الإدارة */
export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role as UserRole)) {
    throw new AuthError("ليست لديك صلاحية الوصول إلى لوحة التحكم", 403);
  }
  return user;
}

/** يتطلب صلاحية محددة */
export async function requirePermission(permission: PermissionKey) {
  const user = await requireStaff();
  const allowed = await roleHasPermissionDb(user.role as UserRole, permission);
  if (!allowed) {
    throw new AuthError("ليست لديك الصلاحية لتنفيذ هذه العملية", 403);
  }
  return user;
}

/** فحص صلاحية دون رمي خطأ */
export async function hasPermission(
  permission: PermissionKey
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.role) return false;
  return roleHasPermissionDb(session.user.role as UserRole, permission);
}
