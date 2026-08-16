"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";

export type ActionResult = { ok: true } | { ok: false; error: string };

const productSchema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().positive("السعر يجب أن يكون موجباً"),
  compareAtPrice: z.coerce.number().optional(),
  cost: z.coerce.number().optional(),
  sku: z.string().optional(),
  material: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]),
  isFeatured: z.coerce.boolean().optional(),
  shippingScope: z.enum(["both", "domestic", "international"]).optional(),
  media: z.string().optional(),
});

type MediaItem = { url: string; type: "image" | "video" };

function parseMedia(raw?: string): MediaItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (m) =>
        m &&
        typeof m.url === "string" &&
        (m.type === "image" || m.type === "video")
    );
  } catch {
    return [];
  }
}

function parseForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    shortDescription: formData.get("shortDescription") || undefined,
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || undefined,
    cost: formData.get("cost") || undefined,
    sku: formData.get("sku") || undefined,
    material: formData.get("material") || undefined,
    brandId: formData.get("brandId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    status: formData.get("status") || "DRAFT",
    isFeatured: formData.get("isFeatured") === "on",
    shippingScope: formData.get("shippingScope") || "both",
    media: formData.get("media") || undefined,
  });
}

export async function createProduct(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.PRODUCTS_CREATE);
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;
    const media = parseMedia(d.media);
    const images = media.filter((m) => m.type === "image");
    const videos = media.filter((m) => m.type === "video");

    const product = await prisma.product.create({
      data: {
        name: d.name,
        slug: uniqueSlug(d.name),
        shortDescription: d.shortDescription,
        description: d.description,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        cost: d.cost ?? null,
        sku: d.sku || null,
        material: d.material,
        brandId: d.brandId || null,
        status: d.status,
        isFeatured: d.isFeatured ?? false,
        shippingScope: d.shippingScope ?? "both",
        currency: "TRY",
        categories: d.categoryId
          ? { create: { categoryId: d.categoryId } }
          : undefined,
        images: images.length
          ? {
              create: images.map((img, i) => ({
                url: img.url,
                sortOrder: i,
              })),
            }
          : undefined,
        videos: videos.length
          ? {
              create: videos.map((v, i) => ({ url: v.url, sortOrder: i })),
            }
          : undefined,
      },
    });

    await logAudit({
      userId: user.id,
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      metadata: { name: d.name },
    });

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر إنشاء المنتج" };
  }
}

export async function updateProduct(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
      };
    }
    const d = parsed.data;
    const media = parseMedia(d.media);
    const images = media.filter((m) => m.type === "image");
    const videos = media.filter((m) => m.type === "video");

    await prisma.product.update({
      where: { id },
      data: {
        name: d.name,
        shortDescription: d.shortDescription,
        description: d.description,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        cost: d.cost ?? null,
        sku: d.sku || null,
        material: d.material,
        brandId: d.brandId || null,
        status: d.status,
        isFeatured: d.isFeatured ?? false,
        shippingScope: d.shippingScope ?? "both",
      },
    });

    // مزامنة الوسائط: نستبدل الصور/الفيديو بالقائمة الجديدة
    if (d.media !== undefined) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productVideo.deleteMany({ where: { productId: id } });
      if (images.length) {
        await prisma.productImage.createMany({
          data: images.map((img, i) => ({
            productId: id,
            url: img.url,
            sortOrder: i,
          })),
        });
      }
      if (videos.length) {
        await prisma.productVideo.createMany({
          data: videos.map((v, i) => ({
            productId: id,
            url: v.url,
            sortOrder: i,
          })),
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: "product.update",
      entity: "Product",
      entityId: id,
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر تحديث المنتج" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.PRODUCTS_DELETE);
    // حذف ناعم Soft Delete
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
    await logAudit({
      userId: user.id,
      action: "product.delete",
      entity: "Product",
      entityId: id,
    });
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "تعذّر حذف المنتج" };
  }
}
