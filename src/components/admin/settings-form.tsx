"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveSettings } from "@/app/admin/settings/actions";

export interface SettingField {
  key: string;
  label: string;
  group: string;
  type?: "text" | "textarea" | "boolean";
  value: string;
  help?: string;
}

export function SettingsForm({ fields }: { fields: SettingField[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSettings, null);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  // نجمّع الحقول حسب المجموعة
  const groups = fields.reduce<Record<string, SettingField[]>>((acc, f) => {
    (acc[f.group] ??= []).push(f);
    return acc;
  }, {});

  const GROUP_LABELS: Record<string, string> = {
    general: "إعدادات عامة",
    about: "صفحة من نحن",
    contact: "معلومات التواصل",
    social: "التواصل الاجتماعي",
    shipping: "الشحن",
  };

  return (
    <form action={action} className="space-y-6">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 font-semibold">
            {GROUP_LABELS[group] ?? group}
          </h3>
          <div className="space-y-4">
            {items.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label htmlFor={f.key} className="text-sm font-medium">
                  {f.label}
                </label>
                <input type="hidden" name={`group_${f.key}`} value={f.group} />
                {f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    name={`setting_${f.key}`}
                    defaultValue={f.value}
                    rows={5}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : f.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`setting_${f.key}`}
                      defaultChecked={f.value === "true"}
                      value="true"
                    />
                    مفعّل
                  </label>
                ) : (
                  <input
                    id={f.key}
                    name={`setting_${f.key}`}
                    defaultValue={f.value}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                )}
                {f.help && (
                  <p className="text-xs text-muted-foreground">{f.help}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
        {state?.ok && (
          <span className="text-sm text-success">تم الحفظ بنجاح</span>
        )}
        {state && !state.ok && (
          <span className="text-sm text-destructive">{state.error}</span>
        )}
      </div>
    </form>
  );
}
