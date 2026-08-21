import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getClientIpFromHeaderValue } from "@/lib/rate-limit";

/**
 * تسجيل عملية إدارية في سجل التدقيق.
 * يُستدعى من Server Actions بعد كل عملية حساسة.
 */
export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const headersList = await headers();
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata
          ? JSON.parse(JSON.stringify(params.metadata))
          : undefined,
        ipAddress: getClientIpFromHeaderValue(
          headersList.get("x-forwarded-for")
        ),
        userAgent: headersList.get("user-agent") ?? null,
      },
    });
  } catch (err) {
    // لا نُفشل العملية الأساسية بسبب فشل التسجيل، لكن يجب ألا يمرّ هذا بصمت:
    // فشل تسجيل التدقيق لعملية حساسة (تغيير دور، دفع، صلاحيات...) يجب أن يظهر
    // في مراقبة الخادم (Sentry/log aggregator) حتى لو لم يوقف الطلب.
    console.error("[audit] failed to write audit log", {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, {
      tags: { module: "audit" },
      extra: { action: params.action, entity: params.entity },
    });
  }
}
