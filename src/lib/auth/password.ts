import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string) {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 3,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(password: string, passwordHash: string) {
  return verify(passwordHash, password);
}
