import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit, getClientId } from "@/lib/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  // حماية من محاولات تخمين كلمة المرور الحالية
  const limit = rateLimit(
    `pwd:${getClientId(request)}:${session.user.id}`,
    5,
    10 * 60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقاً" },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وتحتوي حرفاً ورقماً",
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "الحساب غير صالح" }, { status: 400 });
  }

  const valid = await verifyPassword(
    user.passwordHash,
    parsed.data.currentPassword
  );
  if (!valid) {
    return NextResponse.json(
      { error: "كلمة المرور الحالية غير صحيحة" },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
