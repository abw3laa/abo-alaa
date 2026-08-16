import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");

  const sections = [
    {
      title: t("aboutTitle"),
      links: [
        { label: t("about"), href: "/about" },
        { label: t("contact"), href: "/contact" },
        { label: t("blog"), href: "/blog" },
      ],
    },
    {
      title: t("customerServiceTitle"),
      links: [
        { label: t("faq"), href: "/faq" },
        { label: t("shipping"), href: "/shipping" },
        { label: t("returns"), href: "/returns" },
      ],
    },
    {
      title: t("policiesTitle"),
      links: [
        { label: t("privacy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
        { label: "إمكانية الوصول", href: "/accessibility" },
      ],
    },
  ];

  return (
    <footer className="border-t bg-secondary/50">
      <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-3 flex items-center gap-2 font-bold">
            <span className="flex size-9 items-center justify-center rounded-md bg-gold text-gold-foreground">
              ع
            </span>
            <span>أبو علاء</span>
          </div>
          <p className="text-sm text-muted-foreground">
            متجرك الأول للأزياء والمنتجات المتنوعة بأفضل الأسعار وجودة موثوقة.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-3 font-semibold">{section.title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t py-4">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} أبو علاء. {t("rights")}
          </p>
          <p>دفع آمن · شحن سريع · دعم على مدار الأسبوع</p>
        </div>
      </div>
    </footer>
  );
}
