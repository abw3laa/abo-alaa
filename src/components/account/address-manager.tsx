"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAddress, deleteAddress } from "@/app/account/actions";

export interface AddressData {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  state: string | null;
  street: string;
  building: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
}

function AddressForm({
  address,
  onDone,
}: {
  address?: AddressData;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveAddress, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      <input
        name="fullName"
        defaultValue={address?.fullName}
        placeholder="الاسم الكامل"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="phone"
        defaultValue={address?.phone}
        placeholder="رقم الهاتف"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="country"
        defaultValue={address?.country ?? "تركيا"}
        placeholder="الدولة"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="city"
        defaultValue={address?.city}
        placeholder="المدينة"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="state"
        defaultValue={address?.state ?? ""}
        placeholder="المنطقة/الولاية (اختياري)"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="postalCode"
        defaultValue={address?.postalCode ?? ""}
        placeholder="الرمز البريدي (اختياري)"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="street"
        defaultValue={address?.street}
        placeholder="الشارع"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="building"
        defaultValue={address?.building ?? ""}
        placeholder="المبنى/الشقة (اختياري)"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <textarea
        name="notes"
        defaultValue={address?.notes ?? ""}
        placeholder="ملاحظات إضافية (اختياري)"
        rows={2}
        className="col-span-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault}
        />
        اجعله العنوان الافتراضي
      </label>
      <div className="col-span-full flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "حفظ العنوان"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
      </div>
      {state && !state.ok && (
        <p className="col-span-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: AddressData[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">العناوين المحفوظة</h1>
        <Button size="sm" onClick={() => setEdit("new")}>
          <Plus className="size-4" /> عنوان جديد
        </Button>
      </div>

      {edit === "new" && <AddressForm onDone={() => setEdit(null)} />}

      {addresses.length === 0 && edit !== "new" ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <MapPin className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            لا توجد عناوين محفوظة. أضف عنواناً لتسريع عملية الشراء.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) =>
            edit === addr.id ? (
              <div key={addr.id} className="sm:col-span-2">
                <AddressForm address={addr} onDone={() => setEdit(null)} />
              </div>
            ) : (
              <div key={addr.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{addr.fullName}</p>
                  {addr.isDefault && (
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                      افتراضي
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {addr.country}، {addr.city}
                  {addr.state ? `، ${addr.state}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {addr.street}
                  {addr.building ? `، ${addr.building}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{addr.phone}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => setEdit(addr.id)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-4" /> تعديل
                  </button>
                  {confirmDel === addr.id ? (
                    <span className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() =>
                          start(async () => {
                            const r = await deleteAddress(addr.id);
                            if (r.ok) router.refresh();
                            else alert(r.error);
                            setConfirmDel(null);
                          })
                        }
                        disabled={pending}
                        className="font-medium text-destructive hover:underline"
                      >
                        {pending ? "..." : "تأكيد الحذف"}
                      </button>
                      <button
                        onClick={() => setConfirmDel(null)}
                        className="text-muted-foreground hover:underline"
                      >
                        إلغاء
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDel(addr.id)}
                      className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="size-4" /> حذف
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
