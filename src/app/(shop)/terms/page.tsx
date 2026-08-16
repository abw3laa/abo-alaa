import type { Metadata } from "next";

export const metadata: Metadata = { title: "شروط الاستخدام" };

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">شروط الاستخدام</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          باستخدامك متجر أبو علاء فإنك توافق على الشروط التالية. يُرجى قراءتها
          بعناية.
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          استخدام الموقع
        </h2>
        <p>
          يلتزم المستخدم باستخدام الموقع لأغراض مشروعة فقط، وعدم القيام بأي نشاط
          قد يضرّ بالموقع أو المستخدمين الآخرين.
        </p>
        <h2 className="text-lg font-semibold text-foreground">الحسابات</h2>
        <p>
          أنت مسؤول عن الحفاظ على سرية بيانات حسابك وكلمة المرور، وعن جميع
          الأنشطة التي تتم عبر حسابك.
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          الأسعار والطلبات
        </h2>
        <p>
          نحتفظ بحق تعديل الأسعار وتوفّر المنتجات في أي وقت. تخضع جميع الطلبات
          للتأكيد وتوفّر المخزون.
        </p>
      </div>
    </div>
  );
}
