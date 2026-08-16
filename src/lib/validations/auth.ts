import { z } from "zod";

// مخطط التحقق من إنشاء الحساب - يُستخدم في الواجهة والخادم
export const registerSchema = z
  .object({
    name: z.string().min(2, "الاسم قصير جداً").max(100),
    email: z.string().email("بريد إلكتروني غير صالح"),
    phone: z
      .string()
      .min(6, "رقم هاتف غير صالح")
      .max(20)
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف")
      .max(128)
      .regex(/[a-zA-Z]/, "يجب أن تحتوي على حرف")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
