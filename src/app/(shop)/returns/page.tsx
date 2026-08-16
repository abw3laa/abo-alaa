import type { Metadata } from "next";

export const metadata: Metadata = { title: "الاسترجاع والاستبدال" };

export default function ReturnsPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">سياسة الاسترجاع والاستبدال</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          نحرص على رضاك التام. إذا لم يكن المنتج مناسباً، يمكنك إرجاعه أو
          استبداله وفق الشروط التالية.
        </p>
        <h2 className="text-lg font-semibold text-foreground">مدة الاسترجاع</h2>
        <p>يمكنك طلب الاسترجاع أو الاستبدال خلال 14 يوماً من تاريخ الاستلام.</p>
        <h2 className="text-lg font-semibold text-foreground">الشروط</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>أن يكون المنتج بحالته الأصلية دون استخدام.</li>
          <li>وجود العبوة والملصقات الأصلية.</li>
          <li>إرفاق فاتورة الشراء أو رقم الطلب.</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">
          كيفية الاسترجاع
        </h2>
        <p>
          يمكنك تقديم طلب استرجاع من صفحة تفاصيل الطلب في حسابك، وسيتواصل معك
          فريقنا لإتمام الإجراءات.
        </p>
      </div>
    </div>
  );
}
