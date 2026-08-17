"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Upload, X, Loader2 } from "lucide-react";

export interface UploadedMedia {
  url: string;
  type: "image" | "video";
}

interface MediaUploaderProps {
  /** اسم الحقل المخفي الذي يحمل الروابط (JSON array) لإرسالها مع النموذج */
  name: string;
  /** القيم الابتدائية */
  defaultValue?: UploadedMedia[];
  /** السماح بالفيديو */
  allowVideo?: boolean;
  /** حد أقصى لعدد الملفات */
  maxFiles?: number;
  label?: string;
}

export function MediaUploader({
  name,
  defaultValue = [],
  allowVideo = false,
  maxFiles = 8,
  label = "الصور",
}: MediaUploaderProps) {
  const [items, setItems] = useState<UploadedMedia[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const uploaded: UploadedMedia[] = [];
    try {
      for (const file of Array.from(files)) {
        if (items.length + uploaded.length >= maxFiles) break;
        const isVideo = file.type.startsWith("video/");
        try {
          // رفع مباشر إلى Vercel Blob (يتجاوز حد 4.5MB على الدوال الخادمة)
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/admin/upload",
            contentType: file.type,
          });
          uploaded.push({
            url: blob.url,
            type: isVideo ? "video" : "image",
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذّر رفع الملف");
        }
      }
      setItems((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    setItems((prev) => prev.filter((i) => i.url !== url));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.url}
            className="group relative aspect-square overflow-hidden rounded-md border bg-secondary"
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="h-full w-full object-cover"
                muted
              />
            ) : (
              <Image
                src={item.url}
                alt=""
                fill
                sizes="150px"
                className="object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => remove(item.url)}
              className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="حذف"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {items.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-muted-foreground hover:border-gold hover:text-gold"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <>
                <Upload className="size-6" />
                <span className="text-xs">رفع</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={allowVideo ? "image/*,video/*" : "image/*"}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        يمكنك رفع حتى {maxFiles} ملفات. الصور حتى 10MB
        {allowVideo ? "، الفيديو حتى 50MB" : ""}.
      </p>
    </div>
  );
}
