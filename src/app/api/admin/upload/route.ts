import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { verifyFileSignature } from "@/lib/security/file-signature";
import { logAudit } from "@/lib/audit";
import { rateLimit, getClientId } from "@/lib/rate-limit";

// رفع مباشر إلى Vercel Blob من المتصفح (يتجاوز حد 4.5MB على الدوال الخادمة)
// هذا المسار يُصدر توكناً مؤقتاً للرفع بعد التحقق من صلاحية الأدمن، ثم
// يتحقق من التوقيع الحقيقي للملف بعد اكتمال الرفع (Content-Type وحده غير
// موثوق لأنه من تصريح العميل).
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

// SVG وHTML وJS ممنوعة تماماً حتى لو أضيفت لاحقاً بالخطأ لقائمة ALLOWED،
// لأنها قابلة للتنفيذ كسكربت (Stored XSS عبر ملف "صورة")
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "خدمة رفع الملفات غير مُهيّأة. أنشئ Blob Store من لوحة Vercel (Storage) لإضافة BLOB_READ_WRITE_TOKEN.",
      },
      { status: 503 }
    );
  }

  const clientId = getClientId(request);
  const limit = await rateLimit(`upload:${clientId}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات رفع كثيرة، حاول لاحقاً" },
      { status: 429 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  let staffUserId: string | null = null;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // التحقق من صلاحية الأدمن قبل إصدار توكن الرفع
        const staff = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);
        staffUserId = staff.id;
        void pathname;
        void clientPayload;

        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: VIDEO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // التحقق اللاحق من التوقيع الحقيقي للملف (Magic Bytes) - لأن مسار
        // الرفع المباشر للمتصفح (Client Upload) لا يمرّر بايتات الملف عبر
        // خادمنا قبل الرفع، فنتحقق منها بعد اكتمال الرفع مباشرة، ونحذف أي
        // ملف مزوَّر فوراً قبل أن يُستخدم في أي مكان بالموقع.
        try {
          const headResponse = await fetch(blob.url, {
            headers: { Range: "bytes=0-63" },
          });
          const buf = new Uint8Array(await headResponse.arrayBuffer());
          const declaredType = blob.contentType || "";
          const sizeLimit = declaredType.startsWith("video/")
            ? VIDEO_MAX_BYTES
            : IMAGE_MAX_BYTES;

          const contentLengthHeader = headResponse.headers.get(
            "content-range"
          );
          const totalSize = contentLengthHeader
            ? Number(contentLengthHeader.split("/")[1])
            : undefined;

          const sigResult = verifyFileSignature(declaredType, buf);
          const tooLarge =
            typeof totalSize === "number" && totalSize > sizeLimit;

          if (!sigResult.ok || tooLarge) {
            await del(blob.url);
            await logAudit({
              userId: staffUserId,
              action: "upload.rejected_post_verify",
              entity: "Blob",
              metadata: {
                pathname: blob.pathname,
                declaredType,
                reason: tooLarge ? "exceeds size limit" : sigResult.reason,
              },
            });
            return;
          }

          await logAudit({
            userId: staffUserId,
            action: "upload.completed",
            entity: "Blob",
            metadata: { pathname: blob.pathname, contentType: declaredType },
          });
        } catch (err) {
          // إن تعذّر التحقق لأي سبب (شبكة، إلخ) نحذف الملف احتياطياً بدل
          // تركه متاحاً دون تحقق
          try {
            await del(blob.url);
          } catch {
            // تجاهل - سنعتمد على مراجعة يدوية إن استمر الفشل
          }
          console.error("[upload] post-upload verification failed", err);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر رفع الملف";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
