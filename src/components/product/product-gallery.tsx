"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  type: "image" | "video";
  url: string;
  alt?: string | null;
}

export function ProductGallery({
  media,
  productName,
  discount,
}: {
  media: MediaItem[];
  productName: string;
  discount: number;
}) {
  const [active, setActive] = useState(0);
  const current = media[active];

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-lg border bg-secondary text-muted-foreground">
        لا توجد وسائط
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border bg-secondary">
        {current.type === "video" ? (
          <video
            src={current.url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <Image
            src={current.url}
            alt={current.alt ?? productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        )}
        {discount > 0 && (
          <span className="absolute start-3 top-3 rounded bg-destructive px-2 py-1 text-sm font-medium text-destructive-foreground">
            خصم {discount}%
          </span>
        )}
      </div>

      {media.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {media.map((item, i) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`عرض الوسيط ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border bg-secondary transition-all",
                active === i
                  ? "ring-2 ring-gold ring-offset-1"
                  : "hover:opacity-80"
              )}
            >
              {item.type === "video" ? (
                <>
                  <video
                    src={item.url}
                    muted
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </>
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt ?? productName}
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
