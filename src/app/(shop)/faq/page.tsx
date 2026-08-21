import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { safeJsonLd } from "@/lib/security/json-ld";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "الأسئلة الشائعة" };

export const revalidate = 3600;

export default async function FaqPage() {
  const faqs = await prisma.faqItem.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="container max-w-3xl py-8">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <h1 className="mb-6 text-2xl font-bold">الأسئلة الشائعة</h1>
      {faqs.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أسئلة بعد.</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-lg border bg-card p-4"
            >
              <summary className="cursor-pointer list-none font-medium">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
