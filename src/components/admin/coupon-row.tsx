"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/format";
import {
  updateCoupon,
  deleteCoupon,
} from "@/app/admin/coupons/edit-actions";

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "نسبة مئوية",
  FIXED: "قيمة ثابتة",
  FREE_SHIPPING: "شحن مجاني",
};

export interface CouponRowData {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export function CouponRow({ coupon }: { coupon: CouponRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateCoupon, null);
  const [deletePending, startDelete] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  function handleDelete() {
    startDelete(async () => {
      const res = await deleteCoupon(coupon.id);
      if (res.ok) router.refresh();
      else alert(res.error);
      setConfirmDel(false);
    });
  }

  if (editing) {
    return (
      <tr className="border-b bg-secondary/30 last:border-0">
        <td colSpan={7} className="p-3">
          <form
            action={formAction}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <input type="hidden" name="id" value={coupon.id} />
            <input
              name="code"
              defaultValue={coupon.code}
              required
              className="h-10 rounded-md border border-input bg-background px-2 text-sm uppercase"
            />
            <select
              name="type"
              defaultValue={coupon.type}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="PERCENTAGE">نسبة %</option>
              <option value="FIXED">قيمة ثابتة</option>
              <option value="FREE_SHIPPING">شحن مجاني</option>
            </select>
            <input
              name="value"
              type="number"
              step="0.01"
              defaultValue={coupon.value}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            />
            <input
              name="minOrderAmount"
              type="number"
              placeholder="حد أدنى"
              defaultValue={coupon.minOrderAmount ?? ""}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            />
            <input
              name="maxUses"
              type="number"
              placeholder="حد الاستخدام"
              defaultValue={coupon.maxUses ?? ""}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={coupon.isActive}
                />
                فعّال
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "..." : "حفظ"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                إلغاء
              </Button>
            </div>
            {state && !state.ok && (
              <p className="col-span-full text-sm text-destructive">
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0">
      <td className="p-3 font-mono font-medium">{coupon.code}</td>
      <td className="p-3">{TYPE_LABELS[coupon.type]}</td>
      <td className="p-3">
        {coupon.type === "PERCENTAGE"
          ? `${coupon.value}%`
          : coupon.type === "FIXED"
            ? formatPrice(coupon.value, "TRY", "ar")
            : "—"}
      </td>
      <td className="p-3 text-muted-foreground">
        {coupon.usedCount}
        {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
      </td>
      <td className="p-3 text-muted-foreground">
        {coupon.expiresAt ? formatDate(coupon.expiresAt, "ar") : "—"}
      </td>
      <td className="p-3">
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            coupon.isActive
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {coupon.isActive ? "فعّال" : "متوقف"}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="تعديل"
          >
            <Pencil className="size-4" />
          </button>
          {confirmDel ? (
            <span className="flex items-center gap-1 text-xs">
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="font-medium text-destructive hover:underline"
              >
                {deletePending ? "..." : "تأكيد"}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-muted-foreground hover:underline"
              >
                إلغاء
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-destructive hover:text-destructive/80"
              aria-label="حذف"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
