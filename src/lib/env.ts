import { z } from "zod";

const envSchema = z.object({
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ACTIVATION_PRIVATE_KEY: z.string().min(1),
  ACTIVATION_PUBLIC_KEY_ID: z.string().min(1),
  FIRST_SUPER_ADMIN_NAME: z.string().min(1),
  FIRST_SUPER_ADMIN_EMAIL: z.string().email(),
  FIRST_SUPER_ADMIN_PASSWORD: z.string().min(12),
  DEFAULT_ISSUER: z.string().min(1).default("launcher-manager-activation"),
  TOKEN_VALIDITY_DAYS: z.coerce.number().int().positive().default(180),
  TOKEN_RENEWAL_DAYS: z.coerce.number().int().positive().default(30),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
