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

/**
 * تراتبية الأدوار (Role Hierarchy) - تُستخدم لمنع تصعيد الصلاحيات:
 * - لا يستطيع أي مستخدم تعديل دور مستخدم آخر يملك رتبة مساوية أو أعلى منه.
 * - لا يستطيع أي مستخدم منح دور برتبة أعلى من رتبته هو.
 * - هذا دفاع إضافي (Defense in Depth) حتى لو مُنحت صلاحية ROLES_MANAGE
 *   خطأً لدور أدنى من SUPER_ADMIN/ADMIN.
 */
const ROLE_RANK: Record<(typeof ROLE_VALUES)[number], number> = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  MANAGER: 70,
  PRODUCT_MANAGER: 50,
  ORDER_MANAGER: 50,
  CONTENT_EDITOR: 40,
  CUSTOMER_SUPPORT: 40,
  ANALYST: 30,
  CUSTOMER: 0,
};

/** حفظ صلاحيات دور معيّن في قاعدة البيانات (RolePermission) */
export async function updateRolePermissions(
  role: string,
  permissionKeys: string[]
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const parsedRole = z.enum(ROLE_VALUES).safeParse(role);
    if (!parsedRole.success) return { ok: false, error: "دور غير صالح" };

    // منع تعديل صلاحيات SUPER_ADMIN (يملك كل الصلاحيات دائماً)
    if (parsedRole.data === "SUPER_ADMIN") {
      return { ok: false, error: "لا يمكن تعديل صلاحيات المدير العام" };
    }

    // لا يستطيع أي مستخدم تعديل صلاحيات دور مساوٍ أو أعلى من دوره هو
    if (ROLE_RANK[parsedRole.data] >= ROLE_RANK[admin.role as UserRole]) {
      return {
        ok: false,
        error: "لا يمكنك تعديل صلاحيات دور بمستوى مساوٍ أو أعلى من دورك",
      };
    }

    const validKeys = Object.values(PERMISSIONS) as string[];
    const keys = permissionKeys.filter((k) => validKeys.includes(k));

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
      userId: admin.id,
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

    // P0: منع تصعيد الصلاحيات (Privilege Escalation)
    // 1) لا يمكن لأي مستخدم تغيير دوره لنفسه (حتى SUPER_ADMIN، لتفادي
    //    تنازل غير مقصود عن الصلاحية العليا دون تدخل مستخدم آخر)
    if (target.id === admin.id) {
      return { ok: false, error: "لا يمكنك تغيير دورك الخاص" };
    }

    const targetCurrentRank = ROLE_RANK[target.role as UserRole];
    const adminRank = ROLE_RANK[admin.role as UserRole];
    const newRoleRank = ROLE_RANK[parsedRole.data];

    // 2) لا يمكن تعديل دور مستخدم يملك رتبة مساوية أو أعلى من رتبة المنفّذ
    if (targetCurrentRank >= adminRank) {
      return {
        ok: false,
        error: "لا يمكنك تعديل دور مستخدم بمستوى مساوٍ أو أعلى من دورك",
      };
    }

    // 3) لا يمكن منح دور برتبة أعلى من رتبة المنفّذ نفسه (يمنع ADMIN من
    //    ترقية موظف إلى SUPER_ADMIN مثلاً)
    if (newRoleRank >= adminRank) {
      return {
        ok: false,
        error: "لا يمكنك منح دور بمستوى مساوٍ أو أعلى من دورك",
      };
    }

    // 4) حماية آخر SUPER_ADMIN من فقدان هذا الدور بالخطأ (لن يحدث فعلياً
    //    لأن فقط SUPER_ADMIN رتبته 100 ولا يوجد أعلى منها ليعدّله وفق
    //    القاعدة (2) أعلاه - لكن هذا تحقق إضافي صريح لمزيد من الوضوح)
    if (target.role === "SUPER_ADMIN") {
      return {
        ok: false,
        error: "لا يمكن تعديل دور مدير عام عبر هذا المسار",
      };
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        role: parsedRole.data as UserRole,
        // تغيير الدور يجب أن يسري فوراً على الجلسات الحالية للمستخدم
        sessionsInvalidatedAt: new Date(),
      },
    });
    await logAudit({
      userId: admin.id,
      action: "user.role_update",
      entity: "User",
      entityId: target.id,
      metadata: { role: parsedRole.data, previousRole: target.role },
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تغيير الدور" };
  }
}
