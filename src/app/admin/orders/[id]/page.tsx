import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/format";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { TrackingControl } from "@/components/admin/tracking-control";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.ORDERS_VIEW);
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipments: true,
      shippingAddress: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(order.createdAt, "ar")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* المنتجات */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-semibold">المنتجات</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b pb-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.variantInfo && (
                      <p className="text-xs text-muted-foreground">
                        {item.variantInfo} · الكمية {item.quantity}
                      </p>
                    )}
                  </div>
                  <span>
                    {formatPrice(Number(item.lineTotal), order.currency, "ar")}
                  </span>
                </div>
              ))}
            </div>
            <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
              <Row
                label="المجموع الفرعي"
                value={formatPrice(
                  Number(order.subtotal),
                  order.currency,
                  "ar"
                )}
              />
              <Row
                label="الشحن"
                value={formatPrice(
                  Number(order.shippingTotal),
                  order.currency,
                  "ar"
                )}
              />
              <Row
                label="الضريبة"
                value={formatPrice(
                  Number(order.taxTotal),
                  order.currency,
                  "ar"
                )}
              />
              <div className="flex justify-between border-t pt-2 font-bold">
                <dt>الإجمالي</dt>
                <dd>
                  {formatPrice(Number(order.grandTotal), order.currency, "ar")}
                </dd>
              </div>
            </dl>
          </div>

          {/* الشحنات */}
          {order.shipments.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-semibold">الشحن</h3>
              {order.shipments.map((s) => (
                <div key={s.id} className="text-sm">
                  <p>
                    {s.carrier} — {s.trackingNumber}
                  </p>
                  {s.trackingUrl && (
                    <a
                      href={s.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      تتبّع الشحنة
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* التحكم بالحالة */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-semibold">حالة الطلب</h3>
            <OrderStatusControl
              orderId={order.id}
              currentStatus={order.status}
            />
          </div>

          {/* إضافة معلومات الشحن والتتبع */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-semibold">إضافة شحنة / رقم تتبع</h3>
            <TrackingControl orderId={order.id} />
          </div>

          {/* بيانات العميل */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-3 font-semibold">العميل</h3>
            <p className="text-sm font-medium">{order.customerName}</p>
            <p className="text-sm text-muted-foreground">
              {order.user?.email ?? order.guestEmail}
            </p>
            <p className="text-sm text-muted-foreground">
              {order.user?.phone ?? order.guestPhone}
            </p>
          </div>

          {/* عنوان الشحن */}
          {order.shippingAddress && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-semibold">عنوان الشحن</h3>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.city}، {order.shippingAddress.street}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
