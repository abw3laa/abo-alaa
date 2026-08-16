"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  updateCustomerTier,
  grantLoyaltyPoints,
} from "@/app/admin/customers/actions";

const TIERS = [
  { value: "NEW", label: "جديد" },
  { value: "REGULAR", label: "منتظم" },
  { value: "VIP", label: "مميّز VIP" },
];

export function CustomerControls({
  userId,
  currentTier,
}: {
  userId: string;
  currentTier: string;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function saveTier() {
    setMessage(null);
    startTransition(async () => {
      const res = await updateCustomerTier(userId, tier);
      setMessage(res.ok ? "تم تحديث فئة العميل" : res.error);
      if (res.ok) router.refresh();
    });
  }

  function sendPoints() {
    setMessage(null);
    const n = parseInt(points, 10);
    if (!n || !reason) {
      setMessage("أدخل عدد النقاط والسبب");
      return;
    }
    startTransition(async () => {
      const res = await grantLoyaltyPoints(userId, n, reason);
      if (res.ok) {
        setMessage("تم منح النقاط");
        setPoints("");
        setReason("");
        router.refresh();
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">فئة العميل</label>
        <div className="flex gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={saveTier}
            disabled={pending || tier === currentTier}
          >
            حفظ
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium">منح نقاط ولاء</label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="عدد النقاط (سالب للخصم)"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب (مثال: هدية ترحيبية)"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
        <Button
          size="sm"
          variant="gold"
          onClick={sendPoints}
          disabled={pending}
          className="w-full"
        >
          منح النقاط
        </Button>
      </div>

      {message && (
        <p className="text-center text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
