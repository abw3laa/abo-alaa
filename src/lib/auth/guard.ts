import { auth } from "@/lib/auth";
import {
  roleHasPermission,
  isStaff,
  type PermissionKey,
} from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

/**
 * حراسة الصلاحيات على مستوى الخادم.
 * تُستخدم داخل Server Actions و Route Handlers.
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
  if (!roleHasPermission(user.role as UserRole, permission)) {
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
  return roleHasPermission(session.user.role as UserRole, permission);
}
