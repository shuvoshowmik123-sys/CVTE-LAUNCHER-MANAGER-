import "server-only";

import { count, eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";
import { securitySettings, users } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";

let bootstrapPromise: Promise<void> | null = null;

export async function ensureSystemBootstrapped() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }

  await bootstrapPromise;
}

async function bootstrap() {
  const env = getEnv();

  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount === 0) {
    await db.insert(users).values({
      id: crypto.randomUUID(),
      name: env.FIRST_SUPER_ADMIN_NAME,
      email: env.FIRST_SUPER_ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(env.FIRST_SUPER_ADMIN_PASSWORD),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      forcePasswordReset: false,
    });
  }

  const existingSettings = await db.select().from(securitySettings).where(eq(securitySettings.id, "global")).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(securitySettings).values({
      id: "global",
      issuer: env.DEFAULT_ISSUER,
      tokenValidityDays: env.TOKEN_VALIDITY_DAYS,
      renewalWindowDays: env.TOKEN_RENEWAL_DAYS,
      activationEnabled: true,
      allowAdminApprovals: true,
      publicKeyId: env.ACTIVATION_PUBLIC_KEY_ID,
    });
  }
}
