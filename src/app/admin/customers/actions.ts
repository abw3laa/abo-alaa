"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function toggleCustomerBan(
  userId: string,
  ban: boolean
): Promise<ActionResult> {
  try {
    const admin = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: ban },
    });
    await logAudit({
      userId: admin.id,
      action: ban ? "customer.ban" : "customer.unban",
      entity: "User",
      entityId: userId,
    });
    revalidatePath(`/admin/customers/${userId}`);
    revalidatePath("/admin/customers");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّرت العملية" };
  }
}
