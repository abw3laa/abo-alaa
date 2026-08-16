import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "من نحن" };

export const dynamic = "force-dynamic";

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return null;
  const v =
    typeof row.value === "string" ? row.value : JSON.stringify(row.value);
  return v.replace(/^"|"$/g, "");
}

export default async function AboutPage() {
  const [title, content] = await Promise.all([
    getSetting("about_title"),
    getSetting("about_content"),
  ]);

  // إن حرّر الأدمن المحتوى نعرضه، وإلا نعرض المحتوى الافتراضي
  if (content) {
    return (
      <div className="container max-w-3xl py-8">
        <h1 className="mb-6 text-2xl font-bold">{title ?? "من نحن"}</h1>
        <div className="space-y-4 whitespace-pre-line text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">{title ?? "من نحن"}</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          متجر أبو علاء هو وجهتك الأولى للتسوّق الإلكتروني في مجال الأزياء
          والملابس والأحذية والإكسسوارات والإلكترونيات الخفيفة ومنتجات المنزل.
          نسعى لتقديم تجربة تسوّق سلسة وآمنة بأفضل الأسعار وجودة موثوقة.
        </p>
        <p>
          نؤمن بأن العميل هو محور اهتمامنا، لذلك نحرص على توفير منتجات مختارة
          بعناية، وخدمة عملاء متميزة، وشحن سريع، وسياسة استرجاع مرنة.
        </p>
        <h2 className="text-lg font-semibold text-foreground">رؤيتنا</h2>
        <p>
          أن نكون المتجر الإلكتروني الرائد الذي يجمع بين الجودة والسعر المناسب
          وتجربة المستخدم الاستثنائية.
        </p>
        <h2 className="text-lg font-semibold text-foreground">قيمنا</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>الجودة أولاً في كل منتج نقدّمه.</li>
          <li>الشفافية والمصداقية في التعامل.</li>
          <li>سرعة الاستجابة لاحتياجات عملائنا.</li>
          <li>حماية خصوصية وبيانات المستخدمين.</li>
        </ul>
      </div>
    </div>
  );
}
