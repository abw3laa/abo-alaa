import type { Metadata } from "next";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">سياسة الخصوصية</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          نحن في متجر أبو علاء نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
          توضّح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك.
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          البيانات التي نجمعها
        </h2>
        <p>
          نجمع البيانات التي تقدّمها عند إنشاء حساب أو إتمام طلب مثل الاسم
          والبريد والهاتف وعنوان الشحن. لا نخزّن بيانات بطاقتك البنكية على
          خوادمنا؛ تتم معالجة المدفوعات عبر مزوّد دفع آمن ومعتمد.
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          استخدام البيانات
        </h2>
        <ul className="list-inside list-disc space-y-1">
          <li>معالجة الطلبات وتوصيلها.</li>
          <li>تحسين تجربة التسوّق وخدمة العملاء.</li>
          <li>إرسال إشعارات الطلب والعروض (يمكنك إلغاء الاشتراك).</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">حقوقك</h2>
        <p>
          يمكنك الوصول إلى بياناتك وتعديلها أو طلب حذف حسابك في أي وقت من خلال
          إعدادات حسابك.
        </p>
      </div>
    </div>
  );
}
