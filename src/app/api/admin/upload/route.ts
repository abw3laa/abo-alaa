import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireStaff } from "@/lib/auth/guard";

// رفع مباشر إلى Vercel Blob من المتصفح (يتجاوز حد 4.5MB على الدوال الخادمة)
// هذا المسار يُصدر توكناً مؤقتاً للرفع بعد التحقق من صلاحية الأدمن
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

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // التحقق من صلاحية الأدمن قبل إصدار توكن الرفع
        await requireStaff();
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB (فيديو)
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // لا حاجة لإجراء إضافي؛ نحفظ الرابط في النموذج
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر رفع الملف";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
