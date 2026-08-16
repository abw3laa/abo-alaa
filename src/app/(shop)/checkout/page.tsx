import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "إتمام الطلب" };

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const methods = await prisma.paymentMethodOption.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, description: true, instructions: true },
  });

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">إتمام الطلب</h1>
      <CheckoutView
        paymentMethods={methods.map((m) => ({
          code: m.code,
          name: m.name,
          description: m.description,
          instructions: m.instructions,
        }))}
      />
    </div>
  );
}
