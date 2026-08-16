# دليل النشر السحابي — متجر أبو علاء

هذا الدليل يشرح النشر بالكامل عبر السحابة **دون أي تشغيل محلي**: قاعدة بيانات على Neon، والواجهة على Vercel، والتكامل مع GitHub.

---

## الخطوة 1: قاعدة بيانات PostgreSQL على Neon (مجاني)

1. أنشئ حساباً على [neon.tech](https://neon.tech) (الدخول عبر GitHub أسرع).
2. اضغط **Create Project**:
   - الاسم: `abo-alaa`
   - المنطقة: اختر الأقرب (مثل `Europe (Frankfurt)`).
3. بعد الإنشاء، افتح **Connection Details** وانسخ رابط الاتصال. سيكون بالشكل:
   ```
   postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require
   ```
4. احتفظ برابطين إن أمكن:
   - **Pooled connection** (للتطبيق وقت التشغيل) → `DATABASE_URL`
   - **Direct connection** (للهجرات) → إن أردت فصلها، لكن يكفي الرابط الواحد للبداية.

> Neon يوفّر نسخاً احتياطية تلقائية (Point-in-time restore) على الخطة المجانية.

---

## الخطوة 2: النشر على Vercel

1. أنشئ حساباً على [vercel.com](https://vercel.com) وسجّل الدخول عبر GitHub.
2. **Add New → Project** ثم اختر مستودع `abw3laa/abo-alaa`.
3. Vercel سيكتشف Next.js تلقائياً. أمر البناء مضبوط مسبقاً في `vercel.json`:
   ```
   npm run vercel-build
   ```
   وهو يشغّل: توليد Prisma → تطبيق الهجرات (`prisma migrate deploy`) → بناء Next.

### متغيرات البيئة المطلوبة في Vercel

من **Project Settings → Environment Variables** أضف:

| المفتاح                        | القيمة                            | ملاحظات            |
| ------------------------------ | --------------------------------- | ------------------ |
| `DATABASE_URL`                 | رابط Neon                         | إلزامي             |
| `AUTH_SECRET`                  | مفتاح عشوائي طويل                 | ولّده بالأمر أدناه |
| `AUTH_TRUST_HOST`              | `true`                            | إلزامي على Vercel  |
| `NEXT_PUBLIC_SITE_URL`         | `https://<اسم-مشروعك>.vercel.app` | حدّثه بعد أول نشر  |
| `NEXT_PUBLIC_SITE_NAME`        | `Abo-alaa`                        | اختياري            |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | `TRY`                             | اختياري            |
| `PAYMENT_PROVIDER`             | `mock`                            | يُغيّر لاحقاً      |
| `EMAIL_PROVIDER`               | `mock`                            | يُغيّر لاحقاً      |

توليد `AUTH_SECRET` (من أي طرفية أو من Vercel CLI):

```
npx auth secret
```

أو أي سلسلة عشوائية 32+ بايت (Base64).

4. اضغط **Deploy**. بعد اكتمال النشر، حدّث `NEXT_PUBLIC_SITE_URL` بالدومين الفعلي ثم أعد النشر (Redeploy).

---

## الخطوة 3: زراعة البيانات التجريبية (مرة واحدة)

الهجرات تُطبّق تلقائياً في كل نشر. أما البيانات التجريبية (Seed) فتُشغّل مرة واحدة. الطريقة الأسهل دون تشغيل محلي:

### الخيار أ — عبر Neon SQL Editor + سكربت

بعد أول نشر ناجح، شغّل الـ Seed من جهاز فيه Node عبر تعيين `DATABASE_URL` مؤقتاً:

```
DATABASE_URL="<رابط-Neon>" SEED_ADMIN_EMAIL="admin@abo-alaa.com" SEED_ADMIN_PASSWORD="<كلمة-قوية>" npm run prisma:seed
```

### الخيار ب — GitHub Actions يدوي (موصى به، بلا تشغيل محلي)

استخدم Workflow الموجود في `.github/workflows/seed.yml`:

1. من إعدادات المستودع: **Settings → Secrets and variables → Actions** أضف:
   - `DATABASE_URL` = رابط Neon
   - `SEED_ADMIN_EMAIL` = بريد المدير
   - `SEED_ADMIN_PASSWORD` = كلمة مرور قوية
2. من تبويب **Actions → Seed Database → Run workflow**.

> شغّل الـ Seed مرة واحدة فقط. تكراره يستخدم `upsert` لذا آمن نسبياً، لكنه سينشئ طلبات/مراجعات مكررة.

---

## الخطوة 4: إنشاء حساب المدير

يُنشأ حساب المدير تلقائياً أثناء الـ Seed باستخدام `SEED_ADMIN_EMAIL` و `SEED_ADMIN_PASSWORD`.

- سجّل الدخول من `/login` ثم ادخل `/admin`.
- **غيّر كلمة المرور فوراً** وفعّل المصادقة الثنائية لاحقاً.

---

## الخطوة 5: الدومين الرسمي

بعد التأكد أن كل شيء يعمل على دومين `.vercel.app`:

1. من **Vercel → Project → Settings → Domains** أضف دومينك.
2. اتبع تعليمات DNS (سجل A أو CNAME).
3. حدّث `NEXT_PUBLIC_SITE_URL` و `AUTH_URL` بالدومين الجديد وأعد النشر.

---

## التحقق من الصحة

- نقطة الصحة: `https://<domain>/api/health` يجب أن ترجع `{"status":"ok","database":"connected"}`.
- الصفحة الرئيسية يجب أن تعرض المنتجات من قاعدة البيانات.
- CI على GitHub (تبويب Actions) يجب أن يكون أخضر.

## استكشاف الأخطاء الشائعة

| المشكلة                            | الحل                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `database: disconnected` في health | تحقق من `DATABASE_URL` وأن `sslmode=require` موجود                |
| فشل الهجرة في النشر                | راجع سجل Build في Vercel؛ تأكد أن قاعدة البيانات فارغة أو متوافقة |
| خطأ AUTH                           | تأكد من `AUTH_SECRET` و `AUTH_TRUST_HOST=true`                    |
| الصفحة فارغة بلا منتجات            | لم تُشغّل الـ Seed بعد — نفّذ الخطوة 3                            |
