import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

/**
 * اختبار تصعيد الصلاحيات (P0 - راجع SECURITY-HARDENING-REPORT.txt F16).
 * ننشئ مستخدمَين تجريبيَّين (ADMIN وSUPER_ADMIN) بكلمات مرور معروفة، نسجّل
 * الدخول كـADMIN عبر واجهة تسجيل الدخول الفعلية، ثم نحاول من صفحة
 * /admin/roles:
 *   1) تغيير دور ADMIN نفسه (self-escalation)
 *   2) تعديل دور SUPER_ADMIN (رتبة أعلى)
 *   3) منح دور SUPER_ADMIN لمستخدم آخر (رتبة أعلى من رتبة المنفِّذ)
 * في الحالات الثلاث يجب أن تظهر رسالة رفض واضحة، وألا يتغيّر الدور فعلياً
 * في قاعدة البيانات.
 *
 * ** يتطلب DATABASE_URL صالحاً وخادماً يعمل فعلياً - لم يُشغَّل هذا
 * الاختبار فعلياً في بيئة التدقيق. راجعه وشغّله محلياً قبل الاعتماد عليه
 * في CI، والأهم: تأكد أن SEED_ADMIN_PASSWORD مضبوط في بيئة الاختبار
 * (seed.ts يفشل بدونه بعد هذا التدقيق). **
 */

const prisma = new PrismaClient();
const TEST_PASSWORD = "E2eTestPassword_2026!";

let adminEmail: string;
let superAdminEmail: string;
let adminId: string;
let superAdminId: string;

test.describe("منع تصعيد الصلاحيات (Privilege Escalation)", () => {
  test.beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const stamp = Date.now();
    adminEmail = `e2e-admin-${stamp}@example.com`;
    superAdminEmail = `e2e-superadmin-${stamp}@example.com`;

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "أدمن اختبار",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    adminId = admin.id;

    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: "مدير عام اختبار",
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, superAdminId] } },
    });
    await prisma.$disconnect();
  });

  async function loginAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(adminEmail);
    await page.getByLabel("كلمة المرور").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  }

  test("ADMIN لا يستطيع تعديل دوره الخاص", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/roles");

    await page
      .getByPlaceholder("بريد المستخدم الإلكتروني")
      .fill(adminEmail);
    await page.locator("select").first().selectOption("MANAGER");
    await page.getByRole("button", { name: "تعيين" }).click();

    await expect(page.getByText(/لا يمكنك تغيير دورك الخاص/)).toBeVisible({
      timeout: 10000,
    });

    const stillAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });
    expect(stillAdmin?.role).toBe("ADMIN");
  });

  test("ADMIN لا يستطيع تعديل دور SUPER_ADMIN", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/roles");

    await page
      .getByPlaceholder("بريد المستخدم الإلكتروني")
      .fill(superAdminEmail);
    await page.locator("select").first().selectOption("MANAGER");
    await page.getByRole("button", { name: "تعيين" }).click();

    // ملاحظة تحقّق دقيق: تتبّعت مسار الكود فعلياً - عندما يكون الهدف
    // SUPER_ADMIN، فحص الرتبة (targetCurrentRank >= adminRank) يطابق دائماً
    // أولاً (رتبة SUPER_ADMIN هي الأعلى الممكنة، 100، فهي >= أي رتبة أخرى
    // دائماً)، لذا الرسالة الفعلية هنا هي رسالة "رتبة مساوية أو أعلى" وليس
    // رسالة "لا يمكن تعديل دور مدير عام" المنفصلة (تلك غير قابلة للوصول
    // فعلياً طالما فحص الرتبة يسبقها في الكود - وهذا ليس خطأ، فقط تكرار
    // غير ضار). نتحقق من النص الحقيقي بدقة حرفية بدل تخمين الصياغة.
    await expect(
      page.getByText("لا يمكنك تعديل دور مستخدم بمستوى مساوٍ أو أعلى من دورك")
    ).toBeVisible({ timeout: 10000 });

    const stillSuperAdmin = await prisma.user.findUnique({
      where: { id: superAdminId },
      select: { role: true },
    });
    expect(stillSuperAdmin?.role).toBe("SUPER_ADMIN");
  });

  test("ADMIN لا يستطيع منح دور SUPER_ADMIN لمستخدم آخر", async ({
    page,
  }) => {
    // مستخدم ثالث برتبة منخفضة يحاول ADMIN ترقيته إلى SUPER_ADMIN مباشرة.
    // القائمة المنسدلة في الواجهة تعرض فعلياً خيار "مدير عام" (SUPER_ADMIN)
    // بلا أي قيد Frontend - ما يجعل التحقق الخلفي (Server-side) في
    // updateUserRole هو خط الدفاع الحقيقي الوحيد هنا، وهو ما نتحقق منه.
    const target = await prisma.user.create({
      data: {
        email: `e2e-target-${Date.now()}@example.com`,
        name: "مستخدم هدف الاختبار",
        passwordHash: await hashPassword(TEST_PASSWORD),
        role: "ANALYST",
        isActive: true,
      },
    });

    try {
      await loginAsAdmin(page);
      await page.goto("/admin/roles");

      await page
        .getByPlaceholder("بريد المستخدم الإلكتروني")
        .fill(target.email);
      await page.locator("select").first().selectOption("SUPER_ADMIN");
      await page.getByRole("button", { name: "تعيين" }).click();

      await expect(
        page.getByText(/لا يمكنك منح دور بمستوى مساوٍ أو أعلى من دورك/)
      ).toBeVisible({ timeout: 10000 });

      const stillAnalyst = await prisma.user.findUnique({
        where: { id: target.id },
        select: { role: true },
      });
      expect(stillAnalyst?.role).toBe("ANALYST");
    } finally {
      await prisma.user.delete({ where: { id: target.id } });
    }
  });
});
