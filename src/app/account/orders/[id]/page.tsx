import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "تفاصيل الطلب" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد المراجعة",
  CONFIRMED: "تم التأكيد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  RETURNED: "مسترجع",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار الدفع",
  PAID: "مدفوع",
  FAILED: "فشل الدفع",
  REFUNDED: "مُسترجَع",
  PARTIALLY_REFUNDED: "مُسترجَع جزئياً",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserOrRedirect();
  const { id } = await params;

  // P0 IDOR: يجب أن يشمل شرط البحث userId دائماً - لا يكفي البحث بـid
  // الطلب وحده، وإلا يستطيع أي عميل مسجَّل عرض تفاصيل طلب عميل آخر بمجرد
  // تخمين/معرفة الـid الخاص به (حتى لو كان UUID - UUID ليس حماية IDOR).
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id, deletedAt: null },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });

  // notFound() بدل رسالة "غير مصرَّح" صريحة: لا نكشف للمستخدم أن طلباً
  // بهذا الـid موجود أصلاً لكنه ليس ملكه (نفس مبدأ عدم كشف المعلومات
  // المستخدم في رسائل فشل تسجيل الدخول)
  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة إلى طلباتي
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.createdAt, "ar")}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>
      </div>

      {/* عناصر الطلب */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">المنتجات</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.variantInfo && (
                  <p className="text-xs text-muted-foreground">
                    {item.variantInfo}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  الكمية: {item.quantity}
                </p>
              </div>
              <span className="whitespace-nowrap font-medium">
                {formatPrice(Number(item.lineTotal), order.currency, "ar")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* عنوان الشحن - من اللقطة الثابتة وقت الشراء، وليس العنوان الحالي
          المحفوظ لدى العميل (الذي قد يكون تغيّر لاحقاً) */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">عنوان الشحن</h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          {order.shippingFullName && <p>{order.shippingFullName}</p>}
          {order.shippingPhone && <p>{order.shippingPhone}</p>}
          <p>
            {[
              order.shippingStreet,
              order.shippingBuilding,
              order.shippingCity,
              order.shippingState,
              order.shippingCountry,
            ]
              .filter(Boolean)
              .join("، ")}
          </p>
          {order.shippingPostalCode && <p>{order.shippingPostalCode}</p>}
          {order.shippingNotes && (
            <p className="italic">{order.shippingNotes}</p>
          )}
        </div>
      </div>

      {/* تتبّع الشحنة */}
      {order.shipments.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">تتبّع الشحنة</h2>
          {order.shipments.map((s) => (
            <div key={s.id} className="text-sm text-muted-foreground">
              <p>
                {s.carrier} — {s.trackingNumber}
              </p>
              {s.trackingUrl && (
                <a
                  href={s.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline"
                >
                  تتبّع الشحنة
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ملخص المبالغ */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">ملخص الدفع</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">المجموع الفرعي</dt>
            <dd>{formatPrice(Number(order.subtotal), order.currency, "ar")}</dd>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-gold">
              <dt>
                الخصم
                {order.couponCode ? ` (${order.couponCode})` : ""}
              </dt>
              <dd>
                -{formatPrice(Number(order.discountTotal), order.currency, "ar")}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الشحن</dt>
            <dd>
              {Number(order.shippingTotal) === 0
                ? "مجاني"
                : formatPrice(Number(order.shippingTotal), order.currency, "ar")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الضريبة</dt>
            <dd>{formatPrice(Number(order.taxTotal), order.currency, "ar")}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd>{formatPrice(Number(order.grandTotal), order.currency, "ar")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
