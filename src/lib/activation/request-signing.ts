import "server-only";

import { createPublicKey, verify } from "node:crypto";

import type { DeviceFingerprintPayload, DeviceRequestSignature, SignedLicenseToken } from "@/lib/validators/schemas";

type SignedDevicePayload = {
  fingerprint: DeviceFingerprintPayload;
  license?: SignedLicenseToken;
};

export function verifyDeviceRequestSignature(
  payload: SignedDevicePayload,
  signature: DeviceRequestSignature,
  expectedPublicKeyPem?: string | null,
) {
  if (expectedPublicKeyPem && normalizePem(expectedPublicKeyPem) !== normalizePem(signature.publicKeyPem)) {
    return false;
  }

  const publicKey = createPublicKey(normalizePem(signature.publicKeyPem));
  return verify(
    "sha256",
    Buffer.from(buildDeviceRequestSigningMessage(payload, signature)),
    publicKey,
    Buffer.from(signature.signature, "base64"),
  );
}

export function buildDeviceRequestSigningMessage(payload: SignedDevicePayload, signature: DeviceRequestSignature) {
  return JSON.stringify({
    version: signature.version,
    keyAlgorithm: signature.keyAlgorithm,
    nonce: signature.nonce,
    timestamp: signature.timestamp,
    fingerprint: canonicalFingerprint(payload.fingerprint),
    license: payload.license ? canonicalLicense(payload.license) : null,
  });
}

function canonicalFingerprint(payload: DeviceFingerprintPayload) {
  return {
    primaryMac: payload.primaryMac,
    macAddresses: [...(payload.macAddresses ?? [])],
    androidId: payload.androidId,
    buildFingerprint: payload.buildFingerprint,
    board: payload.board,
    manufacturer: payload.manufacturer,
    model: payload.model,
    packageName: payload.packageName,
    installationId: payload.installationId,
    appVersionName: payload.appVersionName ?? "",
    appVersionCode: payload.appVersionCode ?? 0,
    customerLabel: payload.customerLabel ?? "",
  };
}

function canonicalLicense(license: SignedLicenseToken) {
  return {
    ver: license.ver,
    licenseId: license.licenseId,
    keyId: license.keyId,
    nonce: license.nonce,
    product: license.product,
    macHash: license.macHash,
    deviceHash: license.deviceHash,
    packageName: license.packageName,
    features: [...license.features],
    issuedAt: license.issuedAt,
    notBefore: license.notBefore,
    expiresAt: license.expiresAt,
    issuer: license.issuer,
    signature: license.signature,
  };
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}
