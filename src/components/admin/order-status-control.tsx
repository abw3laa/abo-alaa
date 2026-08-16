"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/app/admin/orders/actions";

const STATUSES = [
  { value: "PENDING", label: "قيد المراجعة" },
  { value: "CONFIRMED", label: "تم التأكيد" },
  { value: "PROCESSING", label: "قيد التجهيز" },
  { value: "SHIPPED", label: "تم الشحن" },
  { value: "DELIVERED", label: "تم التوصيل" },
  { value: "CANCELLED", label: "ملغي" },
  { value: "RETURNED", label: "مسترجع" },
];

export function OrderStatusControl({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.ok) {
        setMessage("تم تحديث الحالة");
        router.refresh();
      } else {
        setMessage(result.error);
        setStatus(currentStatus);
      }
    });
  }

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button
        onClick={handleSave}
        disabled={pending || status === currentStatus}
        className="w-full"
      >
        {pending ? "جارٍ الحفظ..." : "تحديث الحالة"}
      </Button>
      {message && (
        <p className="text-center text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
