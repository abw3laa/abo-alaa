import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { authConfig } from "@/lib/auth/config";
import { rateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();
        const ip = getClientId(request);

        // P0: حماية Rate Limiting حقيقية على تسجيل الدخول، مبنية على
        // (بريد + IP) معاً وليس IP وحده - يمنع Credential Stuffing الموزّع
        // على حسابات كثيرة من نفس IP، وأيضاً هجوماً مركّزاً على حساب واحد
        // عبر عدة IPs (كل مفتاح له حده الخاص).
        const [byEmailIp, byEmail] = await Promise.all([
          rateLimit(`login:${normalizedEmail}:${ip}`, 5, 15 * 60_000),
          rateLimit(`login-email:${normalizedEmail}`, 15, 15 * 60_000),
        ]);
        if (!byEmailIp.allowed || !byEmail.allowed) {
          // لا نكشف تفاصيل إضافية - رسالة عامة كأي فشل تسجيل دخول آخر،
          // Auth.js يحوّلها لمعامل خطأ عام في صفحة /login
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // نفّذ تحقق كلمة مرور "وهمي" حتى عند عدم وجود المستخدم، حتى يتقارب
        // زمن الاستجابة بين "بريد غير موجود" و"كلمة مرور خاطئة" (تخفيف
        // Timing/User-enumeration - ليس حلاً كاملاً لكنه يقلّل الفارق الملحوظ)
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const valid = await verifyPassword(hash, password);

        if (!user || !user.passwordHash) {
          await logAudit({
            action: "auth.login_failed",
            entity: "User",
            metadata: { email: normalizedEmail, reason: "not_found" },
          });
          return null;
        }
        if (user.isBanned || !user.isActive || user.deletedAt) {
          await logAudit({
            userId: user.id,
            action: "auth.login_failed",
            entity: "User",
            entityId: user.id,
            metadata: { reason: "inactive_or_banned" },
          });
          return null;
        }
        if (!valid) {
          await logAudit({
            userId: user.id,
            action: "auth.login_failed",
            entity: "User",
            entityId: user.id,
            metadata: { reason: "bad_password" },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        await logAudit({
          userId: user.id,
          action: "auth.login_success",
          entity: "User",
          entityId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? "CUSTOMER";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.id) return session;

      // إبطال الجلسة إن تغيّرت كلمة المرور (أو حظر/تعديل حساس) بعد إصدار
      // هذا الـJWT. استراتيجية JWT لا تسمح بإبطال فوري للتوكن نفسه، لكن
      // فحص الجلسة على كل طلب (وهو يحدث أصلاً) يمنع استخدامها فعلياً.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          role: true,
          isActive: true,
          isBanned: true,
          deletedAt: true,
          sessionsInvalidatedAt: true,
        },
      });

      const tokenIssuedAt =
        typeof token.iat === "number" ? token.iat * 1000 : 0;
      const invalidated =
        !dbUser ||
        dbUser.isBanned ||
        !dbUser.isActive ||
        !!dbUser.deletedAt ||
        (dbUser.sessionsInvalidatedAt &&
          dbUser.sessionsInvalidatedAt.getTime() > tokenIssuedAt);

      if (invalidated) {
        // نُفرغ هوية المستخدم من الجلسة - requireUser()/requireStaff() سيرفضانها
        // كأنها غير مسجّلة دخول، بدل الاعتماد على بيانات JWT القديمة المحتملة الخطورة.
        return { ...session, user: undefined } as typeof session;
      }

      session.user.id = token.id as string;
      // الدور يُقرأ من قاعدة البيانات الآن (وليس من التوكن فقط) بحيث يسري
      // أي تغيير دور فوراً على الطلب التالي بدل الانتظار لانتهاء صلاحية JWT
      session.user.role = dbUser.role;
      return session;
    },
  },
});

// تجزئة Argon2id ثابتة وهمية (لا تطابق أي كلمة مرور حقيقية) تُستخدم فقط
// لموازنة زمن التحقق حين لا يوجد مستخدم بهذا البريد.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
