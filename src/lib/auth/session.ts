import "server-only";

import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { CSRF_COOKIE_NAME, createCsrfSecret, hashCsrfSecret } from "@/lib/auth/csrf";
import { ensureSystemBootstrapped } from "@/lib/bootstrap";

export const SESSION_COOKIE_NAME = "lm_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type CurrentSession = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "DISABLED" | "PENDING_RESET";
  forcePasswordReset: boolean;
  csrfToken: string;
};

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  await ensureSystemBootstrapped();

  const rawSessionToken = createSessionToken();
  const csrfToken = createCsrfSecret();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    sessionTokenHash: hashToken(rawSessionToken),
    csrfSecretHash: hashCsrfSecret(csrfToken),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: expiresAt,
  });
  cookieStore.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(sessionToken?: string | null) {
  const cookieStore = await cookies();
  const effectiveToken = sessionToken ?? cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (effectiveToken) {
    await db.delete(sessions).where(eq(sessions.sessionTokenHash, hashToken(effectiveToken)));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(CSRF_COOKIE_NAME);
}

export async function invalidateUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  await ensureSystemBootstrapped();

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (!rawToken || !csrfToken) {
    return null;
  }

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      forcePasswordReset: users.forcePasswordReset,
      csrfSecretHash: sessions.csrfSecretHash,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.sessionTokenHash, hashToken(rawToken)), gt(sessions.expiresAt, new Date())),
    )
    .limit(1);

  if (!row || row.status === "DISABLED") {
    await destroySession(rawToken);
    return null;
  }

  if (hashCsrfSecret(csrfToken) !== row.csrfSecretHash) {
    await destroySession(rawToken);
    return null;
  }

  return {
    sessionId: row.sessionId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    forcePasswordReset: row.forcePasswordReset,
    csrfToken,
  };
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function verifyCsrfFromRequest(request: Request, expectedToken: string) {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
  if (!headerToken || !cookieToken) {
    return false;
  }

  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);
  const expectedBuffer = Buffer.from(expectedToken);
  if (headerBuffer.length !== cookieBuffer.length || headerBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return (
    timingSafeEqual(headerBuffer, cookieBuffer) &&
    timingSafeEqual(headerBuffer, expectedBuffer)
  );
}

export async function getRequestIp() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function isSecureCookie() {
  const baseUrl = getEnv().APP_BASE_URL;
  return baseUrl.startsWith("https://");
}
