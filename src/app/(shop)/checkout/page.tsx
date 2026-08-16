import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "إتمام الطلب" };

export default function CheckoutPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">إتمام الطلب</h1>
      <CheckoutView />
    </div>
  );
}
