"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/format";
import { ShoppingBag } from "lucide-react";

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 30;
const TAX_RATE = 0.1;

export interface PaymentMethodOption {
  code: string;
  name: string;
  description: string | null;
  instructions: string | null;
}

export function CheckoutView({
  paymentMethods = [],
}: {
  paymentMethods?: PaymentMethodOption[];
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(
    paymentMethods[0]?.code ?? "cod"
  );
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="سلتك فارغة"
        description="أضف منتجات قبل إتمام الطلب"
        action={
          <Button asChild>
            <Link href="/products">تسوّق الآن</Link>
          </Button>
        }
      />
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      customer: {
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
      },
      address: {
        country: String(fd.get("country") ?? "TR"),
        city: String(fd.get("city") ?? ""),
        street: String(fd.get("street") ?? ""),
        building: String(fd.get("building") ?? ""),
      },
      paymentMethod: String(fd.get("paymentMethod") ?? "cod"),
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "تعذّر إنشاء الطلب، حاول مرة أخرى");
      setSubmitting(false);
      return;
    }

    const { orderNumber } = await res.json();
    clear();
    router.push(`/checkout/success?order=${orderNumber}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {/* معلومات العميل */}
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2 font-semibold">معلومات العميل</legend>
          <Field
            name="name"
            label="الاسم الكامل"
            required
            autoComplete="name"
          />
          <Field
            name="email"
            label="البريد الإلكتروني"
            type="email"
            required
            autoComplete="email"
          />
          <Field
            name="phone"
            label="رقم الهاتف"
            type="tel"
            required
            autoComplete="tel"
          />
        </fieldset>

        {/* عنوان الشحن */}
        <fieldset className="space-y-4 rounded-lg border p-5">
          <legend className="px-2 font-semibold">عنوان الشحن</legend>
          <Field
            name="city"
            label="المدينة"
            required
            autoComplete="address-level2"
          />
          <Field
            name="street"
            label="الشارع"
            required
            autoComplete="street-address"
          />
          <Field name="building" label="المبنى / الشقة" autoComplete="off" />
        </fieldset>

        {/* طريقة الدفع */}
        <fieldset className="space-y-3 rounded-lg border p-5">
          <legend className="px-2 font-semibold">طريقة الدفع</legend>
          {paymentMethods.length === 0 ? (
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                defaultChecked
                className="size-4"
              />
              <span>الدفع عند الاستلام</span>
            </label>
          ) : (
            paymentMethods.map((m) => (
              <label
                key={m.code}
                className="flex cursor-pointer flex-col gap-1 rounded-md border p-3 has-[:checked]:border-gold has-[:checked]:bg-gold/5"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.code}
                    checked={selectedMethod === m.code}
                    onChange={() => setSelectedMethod(m.code)}
                    className="size-4"
                  />
                  <span className="font-medium">{m.name}</span>
                </span>
                {m.description && (
                  <span className="ps-7 text-xs text-muted-foreground">
                    {m.description}
                  </span>
                )}
                {selectedMethod === m.code && m.instructions && (
                  <span className="ps-7 text-xs text-gold">
                    {m.instructions}
                  </span>
                )}
              </label>
            ))
          )}
        </fieldset>
      </div>

      {/* ملخص الطلب */}
      <aside className="h-fit space-y-4 rounded-lg border p-5">
        <h2 className="font-semibold">ملخص الطلب</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li
              key={`${i.productId}-${i.variantId}`}
              className="flex justify-between gap-2"
            >
              <span className="text-muted-foreground">
                {i.name} × {i.quantity}
              </span>
              <span>{formatPrice(i.price * i.quantity, i.currency, "ar")}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المجموع الفرعي</dt>
            <dd>{formatPrice(subtotal, "TRY", "ar")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الشحن</dt>
            <dd>
              {shipping === 0 ? "مجاني" : formatPrice(shipping, "TRY", "ar")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الضريبة</dt>
            <dd>{formatPrice(tax, "TRY", "ar")}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd>{formatPrice(total, "TRY", "ar")}</dd>
          </div>
        </dl>
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting ? "جارٍ التأكيد..." : "تأكيد الطلب"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          بتأكيدك الطلب فإنك توافق على{" "}
          <Link href="/terms" className="underline">
            الشروط
          </Link>{" "}
          و{" "}
          <Link href="/privacy" className="underline">
            سياسة الخصوصية
          </Link>
        </p>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
