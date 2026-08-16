"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addTrackingNumber } from "@/app/admin/orders/actions";

export function TrackingControl({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    if (!carrier || !tracking) {
      setMessage("أدخل شركة الشحن ورقم التتبع");
      return;
    }
    startTransition(async () => {
      const res = await addTrackingNumber(
        orderId,
        carrier,
        tracking,
        trackingUrl || undefined
      );
      if (res.ok) {
        setMessage("تم حفظ معلومات الشحن");
        setCarrier("");
        setTracking("");
        setTrackingUrl("");
        router.refresh();
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        placeholder="شركة الشحن (مثال: Aras Kargo)"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="رقم التتبع"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        placeholder="رابط التتبع (اختياري)"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button onClick={handleSave} disabled={pending} className="w-full">
        {pending ? "جارٍ الحفظ..." : "إضافة معلومات الشحن"}
      </Button>
      {message && (
        <p className="text-center text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
