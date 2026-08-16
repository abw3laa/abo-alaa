import { hash, verify } from "@node-rs/argon2";

// إعدادات Argon2id الموصى بها لعام 2026
const OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/** تشفير كلمة المرور باستخدام Argon2id */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** التحقق من كلمة المرور */
export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, OPTIONS);
  } catch {
    return false;
  }
}
