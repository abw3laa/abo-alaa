import type { Metadata } from "next";

export const metadata: Metadata = { title: "بيان إمكانية الوصول" };

export default function AccessibilityPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">بيان إمكانية الوصول</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          يلتزم متجر أبو علاء بجعل تجربة التسوّق متاحة لأكبر عدد من المستخدمين،
          ونسعى للامتثال لمعايير WCAG 2.2 مستوى AA.
        </p>
        <h2 className="text-lg font-semibold text-foreground">ما نوفّره</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>دعم التنقّل الكامل بلوحة المفاتيح ووضوح مؤشّر التركيز.</li>
          <li>نصوص بديلة وصفية للصور، وعناوين HTML دلالية.</li>
          <li>تباين ألوان مناسب ودعم تكبير النص.</li>
          <li>دعم تقليل الحركة (Reduced Motion) لمن يفضّلها.</li>
          <li>روابط تخطّي إلى المحتوى، ومساحات لمس لا تقل عن 44×44 بكسل.</li>
          <li>اختيار الألوان والمقاسات واضح نصياً وليس بالألوان فقط.</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">
          ملاحظاتك تهمّنا
        </h2>
        <p>
          إن واجهت أي صعوبة في الوصول، تواصل معنا عبر صفحة{" "}
          <a href="/contact" className="underline">
            تواصل معنا
          </a>{" "}
          وسنعمل على معالجتها.
        </p>
      </div>
    </div>
  );
}
