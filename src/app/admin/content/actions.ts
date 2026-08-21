"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { sanitizeContentHtml } from "@/lib/security/sanitize-html";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ==================== المقالات (المدونة) ====================

const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "العنوان قصير جداً"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "المحتوى مطلوب"),
  coverImage: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]),
});

export async function saveBlogPost(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const parsed = postSchema.safeParse({
      id: formData.get("id") || undefined,
      title: formData.get("title"),
      excerpt: formData.get("excerpt") || undefined,
      content: formData.get("content"),
      coverImage: formData.get("coverImage") || undefined,
      category: formData.get("category") || undefined,
      status: formData.get("status") || "DRAFT",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;
    // تنظيف HTML قبل التخزين - يمنع Stored XSS حتى لو تعرّض حساب موظف
    // لديه صلاحية CONTENT_MANAGE للاختراق أو حقن Payload عبر المحرر
    const cleanContent = sanitizeContentHtml(d.content);

    if (d.id) {
      await prisma.blogPost.update({
        where: { id: d.id },
        data: {
          title: d.title,
          excerpt: d.excerpt,
          content: cleanContent,
          coverImage: d.coverImage || null,
          category: d.category || null,
          status: d.status,
        },
      });
    } else {
      await prisma.blogPost.create({
        data: {
          title: d.title,
          slug: uniqueSlug(d.title),
          excerpt: d.excerpt,
          content: cleanContent,
          coverImage: d.coverImage || null,
          category: d.category || null,
          status: d.status,
          authorId: user.id,
        },
      });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "blog.update" : "blog.create",
      entity: "BlogPost",
      entityId: d.id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/blog");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ المقال" };
  }
}

export async function deleteBlogPost(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    await prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
    await logAudit({
      userId: user.id,
      action: "blog.delete",
      entity: "BlogPost",
      entityId: id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/blog");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف المقال" };
  }
}

// ==================== البانرات ====================

const bannerSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  image: z.string().min(1, "الصورة مطلوبة"),
  link: z.string().optional(),
  buttonText: z.string().optional(),
  position: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveBanner(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    // الصورة تأتي من المُحمِّل كـ JSON array؛ نأخذ أول عنصر
    let image = (formData.get("image") as string) || "";
    const mediaRaw = formData.get("media") as string | null;
    if (mediaRaw) {
      try {
        const arr = JSON.parse(mediaRaw);
        if (Array.isArray(arr) && arr[0]?.url) image = arr[0].url;
      } catch {
        /* تجاهل */
      }
    }

    const parsed = bannerSchema.safeParse({
      id: formData.get("id") || undefined,
      title: formData.get("title") || undefined,
      subtitle: formData.get("subtitle") || undefined,
      image,
      link: formData.get("link") || undefined,
      buttonText: formData.get("buttonText") || undefined,
      position: formData.get("position") || "home_hero",
      sortOrder: formData.get("sortOrder") || 0,
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    if (d.id) {
      await prisma.banner.update({
        where: { id: d.id },
        data: {
          title: d.title || null,
          subtitle: d.subtitle || null,
          image: d.image,
          link: d.link || null,
          buttonText: d.buttonText || null,
          position: d.position ?? "home_hero",
          sortOrder: d.sortOrder ?? 0,
          isActive: d.isActive ?? true,
        },
      });
    } else {
      await prisma.banner.create({
        data: {
          title: d.title || null,
          subtitle: d.subtitle || null,
          image: d.image,
          link: d.link || null,
          buttonText: d.buttonText || null,
          position: d.position ?? "home_hero",
          sortOrder: d.sortOrder ?? 0,
          isActive: d.isActive ?? true,
        },
      });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "banner.update" : "banner.create",
      entity: "Banner",
      entityId: d.id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ البانر" };
  }
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    await prisma.banner.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "banner.delete",
      entity: "Banner",
      entityId: id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف البانر" };
  }
}

// ==================== الأسئلة الشائعة ====================

const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(2, "السؤال قصير جداً"),
  answer: z.string().min(1, "الإجابة مطلوبة"),
  category: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveFaq(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    const parsed = faqSchema.safeParse({
      id: formData.get("id") || undefined,
      question: formData.get("question"),
      answer: formData.get("answer"),
      category: formData.get("category") || undefined,
      sortOrder: formData.get("sortOrder") || 0,
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;

    if (d.id) {
      await prisma.faqItem.update({
        where: { id: d.id },
        data: {
          question: d.question,
          answer: d.answer,
          category: d.category || null,
          sortOrder: d.sortOrder ?? 0,
          isActive: d.isActive ?? true,
        },
      });
    } else {
      await prisma.faqItem.create({
        data: {
          question: d.question,
          answer: d.answer,
          category: d.category || null,
          sortOrder: d.sortOrder ?? 0,
          isActive: d.isActive ?? true,
        },
      });
    }
    await logAudit({
      userId: user.id,
      action: d.id ? "faq.update" : "faq.create",
      entity: "FaqItem",
      entityId: d.id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/faq");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حفظ السؤال" };
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.CONTENT_MANAGE);
    await prisma.faqItem.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "faq.delete",
      entity: "FaqItem",
      entityId: id,
    });
    revalidatePath("/admin/content");
    revalidatePath("/faq");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف السؤال" };
  }
}
