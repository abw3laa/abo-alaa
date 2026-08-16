"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/app/account/actions";

export function ProfileForm({
  name,
  phone,
  locale,
}: {
  name: string;
  phone: string;
  locale: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfile, null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  if (!editing) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">بيانات الحساب</h2>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            تعديل
          </Button>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">الاسم</dt>
            <dd className="font-medium">{name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">رقم الهاتف</dt>
            <dd className="font-medium">{phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">اللغة المفضّلة</dt>
            <dd className="font-medium">
              {locale === "ar"
                ? "العربية"
                : locale === "tr"
                  ? "التركية"
                  : "الإنجليزية"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 font-semibold">تعديل البيانات</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            الاسم
          </label>
          <input
            id="name"
            name="name"
            defaultValue={name}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            رقم الهاتف
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={phone}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="locale" className="text-sm font-medium">
            اللغة المفضّلة
          </label>
          <select
            id="locale"
            name="locale"
            defaultValue={locale}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ar">العربية</option>
            <option value="en">الإنجليزية</option>
            <option value="tr">التركية</option>
          </select>
        </div>
      </div>
      {state && !state.ok && (
        <p className="mt-3 text-sm text-destructive">{state.error}</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(false)}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
}
