"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  saveCarrier,
  deleteCarrier,
  saveZone,
  deleteZone,
} from "@/app/admin/shipping/actions";

interface Zone {
  id: string;
  carrierId: string;
  name: string;
  countries: string[];
  baseCost: number;
  perKgCost: number;
  freeOver: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isExpress: boolean;
  isActive: boolean;
}
interface Carrier {
  id: string;
  name: string;
  isActive: boolean;
  zones: Zone[];
}

function DeleteButton({
  onDelete,
}: {
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (confirm) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          onClick={() =>
            start(async () => {
              const r = await onDelete();
              if (r.ok) router.refresh();
              else alert(r.error);
              setConfirm(false);
            })
          }
          disabled={pending}
          className="font-medium text-destructive hover:underline"
        >
          {pending ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-muted-foreground hover:underline"
        >
          إلغاء
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-destructive hover:text-destructive/80"
      aria-label="حذف"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function CarrierForm({
  carrier,
  onDone,
}: {
  carrier?: Carrier;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCarrier, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4"
    >
      {carrier && <input type="hidden" name="id" value={carrier.id} />}
      <input
        name="name"
        defaultValue={carrier?.name}
        placeholder="اسم شركة الشحن"
        required
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <label className="flex items-center gap-1 pb-2 text-xs">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={carrier?.isActive ?? true}
        />
        فعّال
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "حفظ"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        إلغاء
      </Button>
      {state && !state.ok && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function ZoneForm({
  carrierId,
  zone,
  onDone,
}: {
  carrierId: string;
  zone?: Zone;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveZone, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form
      action={action}
      className="grid gap-2 rounded-lg border bg-secondary/30 p-3 sm:grid-cols-3"
    >
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <input type="hidden" name="carrierId" value={carrierId} />
      <input
        name="name"
        defaultValue={zone?.name}
        placeholder="اسم المنطقة (مثال: داخل تركيا)"
        required
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <input
        name="countries"
        defaultValue={zone?.countries.join(", ")}
        placeholder="الدول (TR, SA...)"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <input
        name="baseCost"
        type="number"
        step="0.01"
        defaultValue={zone?.baseCost ?? 0}
        placeholder="التكلفة الأساسية"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <input
        name="perKgCost"
        type="number"
        step="0.01"
        defaultValue={zone?.perKgCost ?? 0}
        placeholder="تكلفة لكل كجم"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <input
        name="freeOver"
        type="number"
        step="0.01"
        defaultValue={zone?.freeOver ?? ""}
        placeholder="مجاني فوق مبلغ"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          name="estimatedDaysMin"
          type="number"
          defaultValue={zone?.estimatedDaysMin ?? 2}
          placeholder="أيام من"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
        <input
          name="estimatedDaysMax"
          type="number"
          defaultValue={zone?.estimatedDaysMax ?? 5}
          placeholder="أيام إلى"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          name="isExpress"
          defaultChecked={zone?.isExpress}
        />
        سريع
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={zone?.isActive ?? true}
        />
        فعّال
      </label>
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

export function ShippingManager({ carriers }: { carriers: Carrier[] }) {
  const [carrierEdit, setCarrierEdit] = useState<string | null>(null);
  const [zoneEdit, setZoneEdit] = useState<string | null>(null); // zone id or "new-<carrierId>"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">شركات الشحن</h3>
        <Button size="sm" onClick={() => setCarrierEdit("new")}>
          <Plus className="size-4" /> شركة جديدة
        </Button>
      </div>

      {carrierEdit === "new" && (
        <CarrierForm onDone={() => setCarrierEdit(null)} />
      )}

      {carriers.map((carrier) => (
        <div key={carrier.id} className="rounded-lg border bg-card p-5">
          {carrierEdit === carrier.id ? (
            <CarrierForm
              carrier={carrier}
              onDone={() => setCarrierEdit(null)}
            />
          ) : (
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">
                {carrier.name}
                {!carrier.isActive && (
                  <span className="ms-2 text-xs text-muted-foreground">
                    (متوقف)
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setZoneEdit(`new-${carrier.id}`)}
                  className="flex items-center gap-1 text-sm text-gold hover:underline"
                >
                  <Plus className="size-4" /> منطقة
                </button>
                <button
                  onClick={() => setCarrierEdit(carrier.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <DeleteButton onDelete={() => deleteCarrier(carrier.id)} />
              </div>
            </div>
          )}

          {zoneEdit === `new-${carrier.id}` && (
            <div className="mb-2">
              <ZoneForm
                carrierId={carrier.id}
                onDone={() => setZoneEdit(null)}
              />
            </div>
          )}

          <div className="space-y-2">
            {carrier.zones.map((zone) =>
              zoneEdit === zone.id ? (
                <ZoneForm
                  key={zone.id}
                  carrierId={carrier.id}
                  zone={zone}
                  onDone={() => setZoneEdit(null)}
                />
              ) : (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{zone.name}</span>
                    {zone.countries.length > 0 && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {zone.countries.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatPrice(zone.baseCost, "TRY", "ar")} ·{" "}
                      {zone.estimatedDaysMin}-{zone.estimatedDaysMax} يوم
                    </span>
                    <button
                      onClick={() => setZoneEdit(zone.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <DeleteButton onDelete={() => deleteZone(zone.id)} />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
