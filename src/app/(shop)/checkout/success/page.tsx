import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "تم استلام طلبك" };

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-12" />
      </div>
      <h1 className="text-2xl font-bold">تم استلام طلبك بنجاح</h1>
      <p className="max-w-md text-muted-foreground">
        شكراً لتسوّقك من متجر أبو علاء. سنبدأ بتجهيز طلبك وسنرسل لك تحديثات
        الحالة.
      </p>
      {order && (
        <div className="rounded-lg border bg-card px-6 py-3">
          <p className="text-sm text-muted-foreground">رقم الطلب</p>
          <p className="text-lg font-bold text-gold">{order}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/account/orders">تتبّع طلباتي</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">متابعة التسوّق</Link>
        </Button>
      </div>
    </div>
  );
}
