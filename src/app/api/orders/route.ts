import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyOrderConfirmed } from "@/lib/notifications";

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
  }),
  address: z.object({
    country: z.string().min(2),
    city: z.string().min(1),
    street: z.string().min(1),
    building: z.string().optional(),
  }),
  paymentMethod: z.enum(["cod", "card"]),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable(),
        quantity: z.number().int().positive().max(99),
      })
    )
    .min(1),
});

const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 30;
const TAX_RATE = 0.1;

function generateOrderNumber(): string {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `AB-${Date.now().toString().slice(-8)}${rand.toString().slice(-3)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const data = parsed.data;
    const session = await auth();

    // معاملة ذرّية: التحقق من المخزون + إنشاء الطلب + خصم المخزون
    const result = await prisma.$transaction(async (tx) => {
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, status: "PUBLISHED", deletedAt: null },
        include: { variants: { include: { inventory: true } } },
      });

      const orderItems = [];
      let subtotal = 0;

      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error("منتج غير متوفر");
        }

        const variant = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)
          : product.variants[0];

        // التحقق من المخزون
        const available = variant?.inventory?.quantity ?? 0;
        if (variant && available < item.quantity) {
          throw new Error(`الكمية المطلوبة من ${product.name} غير متوفرة`);
        }

        const unitPrice = Number(variant?.price ?? product.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        orderItems.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          variantInfo: [variant?.color, variant?.size]
            .filter(Boolean)
            .join(" / "),
          sku: variant?.sku ?? product.sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });

        // خصم المخزون
        if (variant?.inventory) {
          await tx.inventory.update({
            where: { id: variant.inventory.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }
        await tx.product.update({
          where: { id: product.id },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      const tax = Math.round(subtotal * TAX_RATE);
      const grandTotal = subtotal + shipping + tax;

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: session?.user?.id ?? null,
          guestEmail: session?.user?.id ? null : data.customer.email,
          guestPhone: session?.user?.id ? null : data.customer.phone,
          customerName: data.customer.name,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          shippingTotal: shipping,
          taxTotal: tax,
          grandTotal,
          currency: "TRY",
          shippingMethod: shipping === 0 ? "free" : "standard",
          items: { create: orderItems },
          payments: {
            create: {
              provider: data.paymentMethod === "cod" ? "cod" : "mock",
              amount: grandTotal,
              currency: "TRY",
              status: "PENDING",
            },
          },
        },
      });

      return order;
    });

    // إشعار تأكيد الطلب عبر القنوات (لا يُفشل الطلب عند تعذّره)
    await notifyOrderConfirmed({
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? data.customer.email,
      phone: data.customer.phone,
      orderNumber: result.orderNumber,
    });

    return NextResponse.json(
      { success: true, orderNumber: result.orderNumber },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذّر إنشاء الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
