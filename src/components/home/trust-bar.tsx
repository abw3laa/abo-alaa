import { getTranslations } from "next-intl/server";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

export async function TrustBar() {
  const t = await getTranslations("trust");

  const items = [
    { icon: Truck, title: t("fastShipping"), desc: t("fastShippingDesc") },
    {
      icon: ShieldCheck,
      title: t("securePayment"),
      desc: t("securePaymentDesc"),
    },
    { icon: RotateCcw, title: t("easyReturns"), desc: t("easyReturnsDesc") },
    { icon: Headphones, title: t("support"), desc: t("supportDesc") },
  ];

  return (
    <section className="border-y bg-secondary/30">
      <div className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
              <item.icon className="size-6" />
            </div>
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
