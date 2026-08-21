"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, hasPermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import type { OrderStatus } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

/**
 * آلة حالة صريحة (State Machine) لانتقالات حالة الطلب.
 * تمنع قفزات غير منطقية (مثال: PENDING → DELIVERED مباشرة، أو
 * DELIVERED → PENDING) ما لم تُستخدم صلاحية "تصحيح استثنائي" صريحة.
 * CANCELLED وRETURNED حالتان نهائيتان في المسار العادي.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * يتحقق من صحة الانتقال، ويسمح بتجاوزه فقط لمن يملك صلاحية
 * ORDERS_CANCEL كـ"تصحيح استثنائي" (مثال: إصلاح خطأ إداري) - يُسجَّل هذا
 * التجاوز صراحة في Audit Log (isForced: true) لأنه خارج المسار الطبيعي.
 */
async function assertValidTransition(
  from: OrderStatus,
  to: OrderStatus
): Promise<{ forced: boolean } | { error: string }> {
  if (from === to) {
    return { error: "الطلب في هذه الحالة بالفعل" };
  }
  if (ALLOWED_TRANSITIONS[from].includes(to)) {
    return { forced: false };
  }
  const canForce = await hasPermission(PERMISSIONS.ORDERS_CANCEL);
  if (!canForce) {
    return {
      error: `لا يمكن تغيير حالة الطلب من ${from} إلى ${to} مباشرة - يتطلب صلاحية التصحيح الاستثنائي`,
    };
  }
  return { forced: true };
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.ORDERS_UPDATE);
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) {
      return { ok: false, error: "حالة غير صالحة" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) return { ok: false, error: "الطلب غير موجود" };

    const check = await assertValidTransition(order.status, parsed.data);
    if ("error" in check) {
      return { ok: false, error: check.error };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: parsed.data },
    });

    await logAudit({
      userId: user.id,
      action: "order.status_update",
      entity: "Order",
      entityId: orderId,
      metadata: { from: order.status, to: parsed.data, forced: check.forced },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تحديث الحالة" };
  }
}

export async function addTrackingNumber(
  orderId: string,
  carrier: string,
  trackingNumber: string,
  trackingUrl?: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.ORDERS_UPDATE);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!order) return { ok: false, error: "الطلب غير موجود" };

    // إضافة رقم تتبّع تنقل الطلب إلى SHIPPED - يجب أن تمرّ بنفس آلة
    // الحالة (لا يمكن شحن طلب لم يُؤكَّد أو يُجهَّز بعد إلا بتجاوز
    // استثنائي صريح). كانت هذه العملية سابقاً تفرض SHIPPED مباشرة بلا
    // أي تحقق من الحالة الحالية للطلب.
    const check = await assertValidTransition(order.status, "SHIPPED");
    if ("error" in check) {
      return { ok: false, error: check.error };
    }

    await prisma.shipment.create({
      data: {
        orderId,
        carrier,
        trackingNumber,
        trackingUrl: trackingUrl || null,
        status: "shipped",
        shippedAt: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
    });
    await logAudit({
      userId: user.id,
      action: "order.add_tracking",
      entity: "Order",
      entityId: orderId,
      metadata: {
        carrier,
        trackingNumber,
        from: order.status,
        forced: check.forced,
      },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر إضافة رقم التتبع" };
  }
}
