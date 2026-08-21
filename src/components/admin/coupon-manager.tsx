"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCoupon } from "@/app/admin/coupons/actions";

export function CouponManager() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCoupon, null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-6"
    >
      {state && !state.ok && (
        <div
          role="alert"
          className="col-span-full rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-xs font-medium">
          الكود
        </label>
        <input
          id="code"
          name="code"
          required
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm uppercase"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="type" className="text-xs font-medium">
          النوع
        </label>
        <select
          id="type"
          name="type"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="PERCENTAGE">نسبة %</option>
          <option value="FIXED">قيمة ثابتة</option>
          <option value="FREE_SHIPPING">شحن مجاني</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="value" className="text-xs font-medium">
          القيمة
        </label>
        <input
          id="value"
          name="value"
          type="number"
          step="0.01"
          defaultValue="0"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="minOrderAmount" className="text-xs font-medium">
          حد أدنى
        </label>
        <input
          id="minOrderAmount"
          name="minOrderAmount"
          type="number"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="maxUses" className="text-xs font-medium">
          حد الاستخدام الكلي
        </label>
        <input
          id="maxUses"
          name="maxUses"
          type="number"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="maxUsesPerUser" className="text-xs font-medium">
          حد لكل مستخدم
        </label>
        <input
          id="maxUsesPerUser"
          name="maxUsesPerUser"
          type="number"
          min={1}
          placeholder="بلا حد"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="startsAt" className="text-xs font-medium">
          يبدأ في
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="expiresAt" className="text-xs font-medium">
          ينتهي في
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="datetime-local"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <div className="flex items-end gap-2">
        <label className="flex items-center gap-1 pb-2 text-xs">
          <input type="checkbox" name="firstOrderOnly" />
          أول طلب فقط
        </label>
        <label className="flex items-center gap-1 pb-2 text-xs">
          <input type="checkbox" name="isActive" defaultChecked />
          فعّال
        </label>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "..." : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
