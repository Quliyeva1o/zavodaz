"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth";
import { clientIpHash } from "@/lib/client-ip";
import { clearAttempts, isRateLimited, recordAttempt } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});
const WINDOW_SEC = 15 * 60;
const MAX_FAILURES = 5;

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = `admin-login:${await clientIpHash()}`;
  if (await isRateLimited(key, MAX_FAILURES, WINDOW_SEC)) {
    return { error: "Çox cəhd edildi. 15 dəqiqə sonra yenidən yoxlayın." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const [user] = parsed.success
    ? await db
        .select()
        .from(users)
        .where(and(eq(users.email, parsed.data.email), eq(users.role, "admin"), eq(users.status, "active")))
        .limit(1)
    : [];
  const ok = await bcrypt.compare(parsed.success ? parsed.data.password : "", user?.passwordHash ?? getDummyHash());
  if (!user || !ok) {
    await recordAttempt(key, WINDOW_SEC);
    return { error: "E-mail və ya şifrə yanlışdır" };
  }

  await clearAttempts(key);
  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
