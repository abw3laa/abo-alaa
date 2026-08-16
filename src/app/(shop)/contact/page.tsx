import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "تواصل معنا" };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">تواصل معنا</h1>
      <p className="mb-6 text-muted-foreground">
        يسعدنا تواصلك معنا لأي استفسار أو ملاحظة. فريق خدمة العملاء متاح
        لمساعدتك.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={Mail}
          title="البريد الإلكتروني"
          value="support@abo-alaa.com"
        />
        <ContactCard icon={Phone} title="الهاتف" value="+90 555 000 0000" />
        <ContactCard icon={MapPin} title="العنوان" value="إسطنبول، تركيا" />
      </div>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Icon className="size-6" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
