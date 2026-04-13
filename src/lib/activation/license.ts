import "server-only";

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

import { getEnv } from "@/lib/env";
import type { SignedLicenseToken } from "@/lib/validators/schemas";

type UnsignedLicense = Omit<SignedLicenseToken, "signature">;

export function createSignedLicense(input: UnsignedLicense): SignedLicenseToken {
  const encoded = encodePayload(input);
  const privateKey = createPrivateKey(normalizePem(getEnv().ACTIVATION_PRIVATE_KEY));
  const signature = sign(null, Buffer.from(encoded), privateKey).toString("base64url");

  return {
    ...input,
    signature,
  };
}

export function verifySignedLicense(license: SignedLicenseToken) {
  const { signature, ...payload } = license;
  const encoded = encodePayload(payload);
  const publicKey = createPublicKey(normalizePem(derivePublicKeyPem()));

  return verify(null, Buffer.from(encoded), publicKey, Buffer.from(signature, "base64url"));
}

export function createLicenseHash(license: SignedLicenseToken) {
  return createHash("sha256").update(JSON.stringify(license)).digest("hex");
}

function encodePayload(payload: UnsignedLicense) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function derivePublicKeyPem() {
  const privateKey = createPrivateKey(normalizePem(getEnv().ACTIVATION_PRIVATE_KEY));
  return createPublicKey(privateKey).export({ format: "pem", type: "spki" }).toString();
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n");
}
