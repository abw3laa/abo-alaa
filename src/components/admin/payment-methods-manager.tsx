"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  savePaymentMethod,
  deletePaymentMethod,
} from "@/app/admin/payments/actions";

interface Method {
  id: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string | null;
  provider: string;
  isActive: boolean;
  sortOrder: number;
}

function MethodForm({
  method,
  onDone,
}: {
  method?: Method;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePaymentMethod, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      {method && <input type="hidden" name="id" value={method.id} />}
      <input
        name="code"
        defaultValue={method?.code}
        placeholder="الرمز (cod, bank_transfer...)"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="name"
        defaultValue={method?.name}
        placeholder="الاسم المعروض"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="description"
        defaultValue={method?.description ?? ""}
        placeholder="وصف مختصر"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <select
        name="provider"
        defaultValue={method?.provider ?? "manual"}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="manual">يدوي</option>
        <option value="stripe">Stripe</option>
        <option value="paypal">PayPal</option>
      </select>
      <textarea
        name="instructions"
        defaultValue={method?.instructions ?? ""}
        placeholder="تعليمات (مثال: رقم الحساب البنكي للتحويل)"
        rows={2}
        className="col-span-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <input
          name="sortOrder"
          type="number"
          defaultValue={method?.sortOrder ?? 0}
          placeholder="الترتيب"
          className="h-10 w-24 rounded-md border border-input bg-background px-3 text-sm"
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={method?.isActive ?? true}
          />
          فعّال
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "حفظ"}
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

export function PaymentMethodsManager({ methods }: { methods: Method[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">طرق الدفع المتاحة</h3>
        <Button size="sm" onClick={() => setEdit("new")}>
          <Plus className="size-4" /> طريقة دفع
        </Button>
      </div>

      {edit === "new" && <MethodForm onDone={() => setEdit(null)} />}

      <div className="space-y-2">
        {methods.length === 0 && edit !== "new" && (
          <p className="text-sm text-muted-foreground">
            لا توجد طرق دفع. أضف الدفع عند الاستلام أو التحويل البنكي أو غيرها.
          </p>
        )}
        {methods.map((m) =>
          edit === m.id ? (
            <MethodForm key={m.id} method={m} onDone={() => setEdit(null)} />
          ) : (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">
                  {m.name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    ({m.code})
                  </span>
                </p>
                {m.description && (
                  <p className="text-xs text-muted-foreground">
                    {m.description}
                  </p>
                )}
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                    m.isActive
                      ? "bg-success/10 text-success"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {m.isActive ? "فعّال" : "متوقف"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEdit(m.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                {confirmDel === m.id ? (
                  <span className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() =>
                        start(async () => {
                          const r = await deletePaymentMethod(m.id);
                          if (r.ok) router.refresh();
                          else alert(r.error);
                          setConfirmDel(null);
                        })
                      }
                      disabled={pending}
                      className="font-medium text-destructive hover:underline"
                    >
                      {pending ? "..." : "تأكيد"}
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
                    onClick={() => setConfirmDel(m.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
