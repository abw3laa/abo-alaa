import type { Metadata } from "next";

export const metadata: Metadata = { title: "الشحن والتوصيل" };

export default function ShippingPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">الشحن والتوصيل</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>نوفّر خيارات شحن متعددة لضمان وصول طلبك بأسرع وقت وبأفضل حالة.</p>
        <h2 className="text-lg font-semibold text-foreground">مدة التوصيل</h2>
        <p>عادة بين 2 إلى 5 أيام عمل حسب منطقتك.</p>
        <h2 className="text-lg font-semibold text-foreground">تكلفة الشحن</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>شحن مجاني للطلبات فوق 500 ل.ت.</li>
          <li>رسوم ثابتة للطلبات الأقل من ذلك.</li>
          <li>خيار الشحن السريع متاح في مناطق محددة.</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">تتبّع الشحنة</h2>
        <p>
          ستصلك رسالة تحتوي على رقم التتبّع بمجرد شحن طلبك، ويمكنك متابعة حالته
          من صفحة تفاصيل الطلب.
        </p>
      </div>
    </div>
  );
}
