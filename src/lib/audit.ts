import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

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
        ipAddress:
          headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: headersList.get("user-agent") ?? null,
      },
    });
  } catch {
    // لا نُفشل العملية الأساسية بسبب فشل التسجيل
  }
}
