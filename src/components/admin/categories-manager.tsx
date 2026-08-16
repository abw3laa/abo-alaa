"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/admin/media-uploader";
import { saveCategory, deleteCategory } from "@/app/admin/categories/actions";

export interface CategoryData {
  id: string;
  name: string;
  nameEn: string | null;
  parentId: string | null;
  parentName: string | null;
  image: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

function CategoryForm({
  category,
  parents,
  onDone,
}: {
  category?: CategoryData;
  parents: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCategory, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      {category?.image && (
        <input type="hidden" name="image" value={category.image} />
      )}
      <input
        name="name"
        defaultValue={category?.name}
        placeholder="اسم التصنيف (عربي)"
        required
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="nameEn"
        defaultValue={category?.nameEn ?? ""}
        placeholder="الاسم بالإنجليزية"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <select
        name="parentId"
        defaultValue={category?.parentId ?? ""}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">— تصنيف رئيسي —</option>
        {parents
          .filter((p) => p.id !== category?.id)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      <input
        name="sortOrder"
        type="number"
        defaultValue={category?.sortOrder ?? 0}
        placeholder="الترتيب"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="col-span-full">
        <MediaUploader
          name="media"
          label="أيقونة/صورة التصنيف"
          maxFiles={1}
          defaultValue={
            category?.image ? [{ url: category.image, type: "image" }] : []
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={category?.isActive ?? true}
        />
        مفعّل
      </label>
      <div className="col-span-full flex gap-2">
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

export function CategoriesManager({
  categories,
}: {
  categories: CategoryData[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const parents = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">التصنيفات</h2>
        <Button size="sm" onClick={() => setEdit("new")}>
          <Plus className="size-4" /> تصنيف جديد
        </Button>
      </div>

      {edit === "new" && (
        <CategoryForm parents={parents} onDone={() => setEdit(null)} />
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/50">
            <tr>
              <th className="p-3 text-start">الاسم</th>
              <th className="p-3 text-start">التصنيف الأب</th>
              <th className="p-3 text-start">المنتجات</th>
              <th className="p-3 text-start">الحالة</th>
              <th className="p-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) =>
              edit === c.id ? (
                <tr key={c.id}>
                  <td colSpan={5} className="p-3">
                    <CategoryForm
                      category={c}
                      parents={parents}
                      onDone={() => setEdit(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="flex items-center gap-2 p-3 font-medium">
                    {c.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    )}
                    {c.name}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {c.parentName ?? "— (رئيسي)"}
                  </td>
                  <td className="p-3">{c.productCount}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        c.isActive
                          ? "bg-success/10 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {c.isActive ? "مفعّل" : "معطّل"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEdit(c.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {confirmDel === c.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button
                            onClick={() =>
                              start(async () => {
                                const r = await deleteCategory(c.id);
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
                          onClick={() => setConfirmDel(c.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
