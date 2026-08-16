import type { Metadata } from "next";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "الموقع تحت الصيانة",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-secondary/30 p-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-gold/10 text-gold">
        <Wrench className="size-10" />
      </div>
      <h1 className="text-2xl font-bold">الموقع تحت الصيانة</h1>
      <p className="max-w-md text-muted-foreground">
        نعمل حالياً على تحسين تجربتك في متجر أبو علاء. سنعود قريباً، شكراً
        لصبرك.
      </p>
    </div>
  );
}
