import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireStaff, AuthError } from "@/lib/auth/guard";

// حد أقصى لحجم الملف (10MB للصور، 50MB للفيديو)
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
];

export async function POST(request: Request) {
  try {
    await requireStaff();
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 403;
    return NextResponse.json({ error: "غير مصرّح" }, { status });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "خدمة رفع الملفات غير مُهيّأة. أضف BLOB_READ_WRITE_TOKEN في إعدادات Vercel.",
      },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم" },
      { status: 400 }
    );
  }

  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `حجم الملف يتجاوز الحد المسموح (${maxSize / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  try {
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url, type: isVideo ? "video" : "image" });
  } catch {
    return NextResponse.json({ error: "تعذّر رفع الملف" }, { status: 500 });
  }
}
