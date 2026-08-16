"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  saveBlogPost,
  deleteBlogPost,
  saveBanner,
  deleteBanner,
  saveFaq,
  deleteFaq,
} from "@/app/admin/content/actions";

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "منشور",
  DRAFT: "مسودة",
  ARCHIVED: "مؤرشف",
};

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string | null;
  status: string;
}
interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image: string;
  link: string | null;
  buttonText: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
}
interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
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

// ---------- المقالات ----------
function PostForm({ post, onDone }: { post?: Post; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBlogPost, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      {post && <input type="hidden" name="id" value={post.id} />}
      <input
        name="title"
        defaultValue={post?.title}
        placeholder="عنوان المقال"
        required
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="category"
        defaultValue={post?.category ?? ""}
        placeholder="التصنيف (اختياري)"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="coverImage"
        defaultValue={post?.coverImage ?? ""}
        placeholder="رابط صورة الغلاف (اختياري)"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="excerpt"
        defaultValue={post?.excerpt ?? ""}
        placeholder="مقتطف قصير"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <textarea
        name="content"
        defaultValue={post?.content}
        rows={6}
        placeholder="محتوى المقال"
        required
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <select
        name="status"
        defaultValue={post?.status ?? "DRAFT"}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="DRAFT">مسودة</option>
        <option value="PUBLISHED">منشور</option>
        <option value="ARCHIVED">مؤرشف</option>
      </select>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "حفظ"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

// ---------- البانرات ----------
function BannerForm({
  banner,
  onDone,
}: {
  banner?: Banner;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBanner, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      {banner && <input type="hidden" name="image" value={banner.image} />}
      <MediaUploader
        name="media"
        label="صورة البانر"
        maxFiles={1}
        defaultValue={
          banner?.image ? [{ url: banner.image, type: "image" }] : []
        }
      />
      <input
        name="title"
        defaultValue={banner?.title ?? ""}
        placeholder="العنوان الرئيسي"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="subtitle"
        defaultValue={banner?.subtitle ?? ""}
        placeholder="العنوان الفرعي / الشارة"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="link"
        defaultValue={banner?.link ?? ""}
        placeholder="رابط الزر (مثال: /products)"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        name="buttonText"
        defaultValue={banner?.buttonText ?? ""}
        placeholder="نص الزر"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="position"
          defaultValue={banner?.position ?? "home_hero"}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="home_hero">الرئيسية - البانر الكبير</option>
          <option value="home_secondary">الرئيسية - ثانوي</option>
          <option value="category_top">أعلى التصنيف</option>
        </select>
        <input
          name="sortOrder"
          type="number"
          defaultValue={banner?.sortOrder ?? 0}
          placeholder="الترتيب"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={banner?.isActive ?? true}
        />
        فعّال
      </label>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "حفظ"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

// ---------- الأسئلة الشائعة ----------
function FaqForm({ faq, onDone }: { faq?: Faq; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveFaq, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <input
        name="question"
        defaultValue={faq?.question}
        placeholder="السؤال"
        required
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <textarea
        name="answer"
        defaultValue={faq?.answer}
        rows={3}
        placeholder="الإجابة"
        required
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="category"
          defaultValue={faq?.category ?? ""}
          placeholder="التصنيف"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={faq?.sortOrder ?? 0}
          placeholder="الترتيب"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={faq?.isActive ?? true}
        />
        فعّال
      </label>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "حفظ"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export function ContentManager({
  posts,
  banners,
  faqs,
}: {
  posts: Post[];
  banners: Banner[];
  faqs: Faq[];
}) {
  const [postEdit, setPostEdit] = useState<string | null>(null);
  const [bannerEdit, setBannerEdit] = useState<string | null>(null);
  const [faqEdit, setFaqEdit] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {/* المقالات */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">المقالات ({posts.length})</h3>
          <Button size="sm" onClick={() => setPostEdit("new")}>
            <Plus className="size-4" /> مقال جديد
          </Button>
        </div>
        {postEdit === "new" && <PostForm onDone={() => setPostEdit(null)} />}
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id}>
              {postEdit === p.id ? (
                <PostForm post={p} onDone={() => setPostEdit(null)} />
              ) : (
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABELS[p.status]} · {p.category ?? "بدون تصنيف"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPostEdit(p.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <DeleteButton onDelete={() => deleteBlogPost(p.id)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* البانرات */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">البانرات ({banners.length})</h3>
          <Button size="sm" onClick={() => setBannerEdit("new")}>
            <Plus className="size-4" /> بانر جديد
          </Button>
        </div>
        {bannerEdit === "new" && (
          <BannerForm onDone={() => setBannerEdit(null)} />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {banners.map((b) => (
            <div key={b.id}>
              {bannerEdit === b.id ? (
                <BannerForm banner={b} onDone={() => setBannerEdit(null)} />
              ) : (
                <div className="rounded-lg border bg-card p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image}
                    alt={b.title ?? "بانر"}
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{b.title ?? "بانر"}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.position} · {b.isActive ? "فعّال" : "متوقف"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBannerEdit(b.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <DeleteButton onDelete={() => deleteBanner(b.id)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            الأسئلة الشائعة ({faqs.length})
          </h3>
          <Button size="sm" onClick={() => setFaqEdit("new")}>
            <Plus className="size-4" /> سؤال جديد
          </Button>
        </div>
        {faqEdit === "new" && <FaqForm onDone={() => setFaqEdit(null)} />}
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id}>
              {faqEdit === f.id ? (
                <FaqForm faq={f} onDone={() => setFaqEdit(null)} />
              ) : (
                <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <p className="font-medium">{f.question}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFaqEdit(f.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <DeleteButton onDelete={() => deleteFaq(f.id)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
