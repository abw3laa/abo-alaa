"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MediaUploader, type UploadedMedia } from "@/components/admin/media-uploader";
import type { ActionResult } from "@/app/admin/products/actions";

interface Option {
  id: string;
  name: string;
}

interface ProductFormProps {
  action: (
    prev: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  categories: Option[];
  brands: Option[];
  defaultValues?: {
    name?: string;
    shortDescription?: string | null;
    description?: string | null;
    price?: number;
    compareAtPrice?: number | null;
    cost?: number | null;
    sku?: string | null;
    material?: string | null;
    brandId?: string | null;
    status?: string;
    isFeatured?: boolean;
    shippingScope?: string;
    media?: UploadedMedia[];
  };
  submitLabel: string;
}

export function ProductForm({
  action,
  categories,
  brands,
  defaultValues,
  submitLabel,
}: ProductFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) {
      router.push("/admin/products");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-4 rounded-lg border bg-card p-5">
        <Field
          name="name"
          label="اسم المنتج"
          required
          defaultValue={defaultValues?.name}
        />
        <div className="space-y-1.5">
          <label htmlFor="shortDescription" className="text-sm font-medium">
            وصف مختصر
          </label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            rows={2}
            defaultValue={defaultValues?.shortDescription ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            الوصف الكامل
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={defaultValues?.description ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <Field
          name="price"
          label="السعر (ل.ت)"
          type="number"
          required
          defaultValue={defaultValues?.price?.toString()}
        />
        <Field
          name="compareAtPrice"
          label="السعر قبل الخصم"
          type="number"
          defaultValue={defaultValues?.compareAtPrice?.toString()}
        />
        <Field
          name="cost"
          label="التكلفة"
          type="number"
          defaultValue={defaultValues?.cost?.toString()}
        />
        <Field name="sku" label="SKU" defaultValue={defaultValues?.sku ?? ""} />
        <Field
          name="material"
          label="الخامة"
          defaultValue={defaultValues?.material ?? ""}
        />
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="text-sm font-medium">
            التصنيف
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— اختر —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="brandId" className="text-sm font-medium">
            الماركة
          </label>
          <select
            id="brandId"
            name="brandId"
            defaultValue={defaultValues?.brandId ?? ""}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— اختر —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            الحالة
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "DRAFT"}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="DRAFT">مسودة</option>
            <option value="PUBLISHED">منشور</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="shippingScope" className="text-sm font-medium">
            نطاق الشحن
          </label>
          <select
            id="shippingScope"
            name="shippingScope"
            defaultValue={defaultValues?.shippingScope ?? "both"}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="both">الكل (داخلي ودولي)</option>
            <option value="domestic">داخل تركيا فقط</option>
            <option value="international">دولي فقط</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={defaultValues?.isFeatured}
            className="size-4"
          />
          <span className="text-sm">منتج مميّز</span>
        </label>
      </div>

      {/* الصور والفيديو */}
      <div className="rounded-lg border bg-card p-5">
        <MediaUploader
          name="media"
          label="صور وفيديو المنتج"
          allowVideo
          maxFiles={8}
          defaultValue={defaultValues?.media ?? []}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/products">إلغاء</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        step={type === "number" ? "0.01" : undefined}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
