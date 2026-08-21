# الأمان — متجر أبو علاء

هذا الملف يوثّق البنية الأمنية للمشروع، ويُستهدف المطوّرين وأي شخص
يراجع أو يُشغّل هذا الكود. للتفاصيل الكاملة عن كل إصلاح أمني ونتائجه،
راجع `SECURITY-HARDENING-REPORT.txt`.

## 1. المصادقة (Authentication)

- Auth.js (NextAuth v5) بمزوّد Credentials، جلسات JWT.
- كلمات المرور: Argon2id (`src/lib/auth/password.ts`) — لا MD5/SHA/bcrypt.
- تسجيل الدخول محمي بـRate Limiting مزدوج (بريد+IP، وبريد بمفرده) في
  `src/lib/auth/index.ts`، مع رسالة فشل موحّدة ومقارنة كلمة مرور وهمية
  عند عدم وجود المستخدم (تخفيف Timing/Enumeration).
- **إبطال الجلسات**: `User.sessionsInvalidatedAt` — يُحدَّث عند تغيير
  كلمة المرور أو الحظر أو تغيير الدور. أي JWT صادر قبل هذا التاريخ
  يُرفض في `session` callback حتى لو لم تنتهِ صلاحيته بعد.
- صفحات `/account/*` تستخدم `requireUserOrRedirect()` (وليس الوصول
  المباشر لـ`session.user` دون تحقق) لأن الجلسة قد تكون مُبطَلة.

## 2. التفويض (Authorization / RBAC)

- `src/lib/auth/guard.ts`: `requireUser()`, `requireStaff()`,
  `requirePermission()` — كلها Server-side، تُستخدم في كل Server Action
  وRoute Handler حسّاس. لا تعتمد على أي فحص Frontend/UI.
- الصلاحيات مخزَّنة في قاعدة البيانات (`RolePermission`) مع رجوع لمصفوفة
  ثابتة في `src/lib/auth/permissions.ts`.
- **تراتبية الأدوار** (`src/app/admin/roles/actions.ts`): يُمنع صراحة
  رفع المستخدم لدوره الخاص، تعديل دور مساوٍ/أعلى، أو منح دور أعلى من
  دور المنفِّذ نفسه.
- **فصل إدارة العملاء عن الموظفين** (`src/app/admin/customers/actions.ts`):
  أي إجراء "إدارة عملاء" يتحقق أولاً أن الهدف `role === CUSTOMER` فعلياً.

## 3. Rate Limiting

- Redis (`ioredis`) عبر Lua script ذرّي (`INCR` + `PEXPIRE`) في
  `src/lib/rate-limit.ts`. **REDIS_URL إلزامي في الإنتاج** — بلا Redis
  يعمل على خطة بديلة في الذاكرة (غير موثوقة عبر أكثر من Instance واحد)
  مع تحذير صريح في السجلات.
- مطبَّق على: تسجيل الدخول، التسجيل، تغيير كلمة المرور، إنشاء الطلبات،
  رفع الملفات، Webhook الدفع، معاينة الكوبونات.

## 4. أمان الدفع (Payment Security)

- السعر النهائي يُحسب دائماً Server-side من قاعدة البيانات — لا يُثق
  بأي مبلغ من الـFrontend.
- `paymentMethod` يُتحقق منه مقابل `PaymentMethodOption.isActive` في
  قاعدة البيانات.
- `PAYMENT_PROVIDER=mock` **يُرفض تلقائياً** في `NODE_ENV=production` ما
  لم يُضبط `ALLOW_MOCK_PAYMENTS=true` صراحة (`src/lib/payments/index.ts`).
- Stripe (`src/lib/payments/stripe-provider.ts`): Checkout Sessions مع
  `idempotencyKey`، Refunds، وتحقق توقيع حقيقي عبر
  `stripe.webhooks.constructEvent` (HMAC + طابع زمني).

## 5. أمان Webhook

- `src/app/api/webhooks/payment/route.ts`: تحقق توقيع إلزامي، Rate
  limiting، Idempotency عبر `WebhookEvent.eventId` الفريد (لا معالجة
  مزدوجة لنفس الحدث)، try/catch شامل (لا تسريب تفاصيل داخلية)، تسجيل
  Audit، وإبلاغ Sentry عند الفشل غير المتوقع.

## 6. المخزون والطلبات (Inventory / Orders)

- خصم مخزون **ذرّي**: `updateMany({where:{quantity:{gte}}, data:{decrement}})`
  بدل read-then-write — يمنع بيع نفس القطعة الأخيرة لطلبين متزامنين.
- عنوان الشحن يُحفظ كـ**لقطة ثابتة** على الطلب نفسه (`Order.shippingCity`
  إلخ) — لا يتأثر إن عدّل العميل عنوانه المحفوظ لاحقاً.
- رقم الطلب: `crypto.randomInt` (CSPRNG) — ليس `Math.random()`.
- **آلة حالة صريحة** لانتقالات حالة الطلب (`src/app/admin/orders/actions.ts`)
  تمنع قفزات غير منطقية (PENDING → DELIVERED مباشرة) إلا بصلاحية تصحيح
  استثنائية مُسجَّلة في Audit.
- الكوبونات: استهلاك ذرّي (`Coupon.usedCount` عبر `updateMany` + شرط
  الحد الأقصى) وتتبّع لكل مستخدم عبر جدول `CouponUsage` مستقل (يشمل
  الضيوف عبر البريد الإلكتروني) — `src/lib/coupons.ts`.

## 7. أمان الرفع (Upload Security)

- `src/app/api/admin/upload/route.ts`: رفع مباشر لـVercel Blob مع تحقق
  لاحق من **التوقيع الحقيقي للملف** (Magic Bytes، وليس Content-Type
  المُعلَن فقط) في `src/lib/security/file-signature.ts`. أي ملف لا
  يطابق يُحذف تلقائياً. HTML/SVG/JS محظورة صراحة بغض النظر عن أي إعداد.

## 8. XSS / CSP

- محتوى المدونة/CMS يُنظَّف بـDOMPurify عند الحفظ وعند العرض (طبقتان
  مستقلتان) — `src/lib/security/sanitize-html.ts`.
- JSON-LD يُهرَّب عبر `src/lib/security/json-ld.ts` (يمنع كسر وسم
  `<script>` مبكراً).
- CSP بدون `unsafe-inline` لـscript-src (Nonce عشوائي لكل طلب، مُولَّد
  في `src/middleware.ts`). `style-src` أيضاً بلا `unsafe-inline`؛
  `style-src-attr` وحدها تسمح بذلك (سمات `style=""` الديناميكية فقط،
  وليس حقن `<style>` كامل).

## 9. إدارة الأسرار (Secrets)

- `.env`, `.env*.local`, `.env.production` مستثناة من Git.
- `.dockerignore` يمنع دخول `.env`/`.git` إلى سياق بناء Docker.
- لا سر افتراضي معروف: `prisma/seed.ts` يفشل بوضوح بلا `SEED_ADMIN_PASSWORD`.
- الأسرار المطلوبة في الإنتاج: `DATABASE_URL`, `AUTH_SECRET`,
  `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `BLOB_READ_WRITE_TOKEN`, وعند الرغبة `SENTRY_DSN`/`SENTRY_AUTH_TOKEN`.

## 10. الإبلاغ عن ثغرات (Reporting Vulnerabilities)

إن وجدت ثغرة أمنية، **لا** تفتح Issue علني على GitHub. تواصل مباشرة عبر
القنوات الموضحة في ملف تعريف المطوّر (WhatsApp/Telegram/Facebook تحت
هوية abw3laa)، مع وصف واضح لخطوات إعادة الإنتاج. لن يُتخذ أي إجراء ضد
من يُبلّغ بحسن نية وفق مبادئ الكشف المسؤول (Responsible Disclosure).

## 11. قائمة تحقق قبل النشر (Production Checklist)

راجع القسم 8 في `SECURITY-HARDENING-REPORT.txt` للقائمة الكاملة. أهم
النقاط:

- [ ] `npm run typecheck && npm run build && npm test && npm run test:e2e`
      نجحت فعلياً على بيئة بوصول شبكي كامل (لم يُختبر في بيئة التدقيق).
- [ ] `npx prisma migrate dev` نُفِّذ وتحقّق من كل الـmigrations اليدوية
      (0003, 0004) بلا Drift.
- [ ] `REDIS_URL` مضبوط ويعمل فعلياً.
- [ ] `PAYMENT_PROVIDER=stripe` مع مفاتيح حقيقية (وليس `mock`) إن كان
      المتجر يقبل مدفوعات حقيقية.
- [ ] `SEED_ADMIN_PASSWORD` قوي وفريد (12+ حرفاً)، ولا يُعاد استخدامه.
- [ ] نسخ احتياطي لقاعدة البيانات مفعَّل ومُختبَر الاسترجاع (راجع
      `OPERATIONS.md`).
- [ ] مراقبة أخطاء (Sentry) مفعَّلة مع `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`.
- [ ] `docker build` (إن استُخدم) نجح فعلياً - لم يُختبر في بيئة التدقيق.
