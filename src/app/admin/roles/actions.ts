"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLE_VALUES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "CONTENT_EDITOR",
  "CUSTOMER_SUPPORT",
  "ANALYST",
  "CUSTOMER",
] as const;

/** حفظ صلاحيات دور معيّن في قاعدة البيانات (RolePermission) */
export async function updateRolePermissions(
  role: string,
  permissionKeys: string[]
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const parsedRole = z.enum(ROLE_VALUES).safeParse(role);
    if (!parsedRole.success) return { ok: false, error: "دور غير صالح" };

    // منع تعديل صلاحيات SUPER_ADMIN (يملك كل الصلاحيات دائماً)
    if (parsedRole.data === "SUPER_ADMIN") {
      return { ok: false, error: "لا يمكن تعديل صلاحيات المدير العام" };
    }

    const validKeys = Object.values(PERMISSIONS) as string[];
    const keys = permissionKeys.filter((k) => validKeys.includes(k));

    // نطابق الصلاحيات في جدول Permission
    const permissions = await prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { role: parsedRole.data as UserRole },
      }),
      prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          role: parsedRole.data as UserRole,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    await logAudit({
      userId: user.id,
      action: "role.permissions_update",
      entity: "RolePermission",
      metadata: { role: parsedRole.data, count: keys.length },
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تحديث الصلاحيات" };
  }
}

/** تغيير دور مستخدم (تعيين مشرف/مدير) */
export async function updateUserRole(
  email: string,
  role: string
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const parsedRole = z.enum(ROLE_VALUES).safeParse(role);
    if (!parsedRole.success) return { ok: false, error: "دور غير صالح" };

    const target = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!target) return { ok: false, error: "لا يوجد مستخدم بهذا البريد" };

    await prisma.user.update({
      where: { id: target.id },
      data: { role: parsedRole.data as UserRole },
    });
    await logAudit({
      userId: admin.id,
      action: "user.role_update",
      entity: "User",
      entityId: target.id,
      metadata: { role: parsedRole.data },
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تغيير الدور" };
  }
}
