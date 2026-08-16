"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

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

    // منع تعديل الطلب بعد الشحن إلا بصلاحية خاصة
    if (
      (order.status === "SHIPPED" || order.status === "DELIVERED") &&
      parsed.data !== "RETURNED"
    ) {
      const canForce = await requirePermission(PERMISSIONS.ORDERS_CANCEL).then(
        () => true,
        () => false
      );
      if (!canForce) {
        return {
          ok: false,
          error: "لا يمكن تعديل طلب تم شحنه إلا بصلاحية خاصة",
        };
      }
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
      metadata: { from: order.status, to: parsed.data },
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
      metadata: { carrier, trackingNumber },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر إضافة رقم التتبع" };
  }
}
