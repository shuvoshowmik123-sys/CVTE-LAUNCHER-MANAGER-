import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE_NAME = "lm_csrf";

export function createCsrfSecret() {
  return cryptoRandomHex(32);
}

export function hashCsrfSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function readCsrfTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
}

export function assertCsrf(expectedHash: string, providedToken: string | null, cookieToken: string | null) {
  if (!providedToken || !cookieToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (providedBuffer.length !== cookieBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(providedBuffer, cookieBuffer)) {
    return false;
  }

  return hashCsrfSecret(providedToken) === expectedHash;
}

function cryptoRandomHex(size: number) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(size))).toString("hex");
}
