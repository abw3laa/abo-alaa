import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const settings = await prisma.setting.findMany({
    orderBy: { key: "asc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">الإعدادات</h2>
      <div className="rounded-lg border bg-card p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          الإعدادات العامة للمتجر. تُدار مفاتيح المزوّدات الخارجية عبر متغيّرات
          البيئة لأسباب أمنية.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr>
                <th className="p-3 text-start">المفتاح</th>
                <th className="p-3 text-start">القيمة</th>
                <th className="p-3 text-start">المجموعة</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3 font-mono">{s.key}</td>
                  <td className="p-3 text-muted-foreground">
                    {JSON.stringify(s.value)}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {s.group}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
