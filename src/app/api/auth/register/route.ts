import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { rateLimit, getClientId } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // حماية من إنشاء حسابات مكثّف: 5 محاولات كل 10 دقائق
    const clientId = getClientId(request);
    const limit = await rateLimit(`register:${clientId}`, 5, 10 * 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة، حاول لاحقاً" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم بالفعل" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || null,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحساب" },
      { status: 500 }
    );
  }
}
