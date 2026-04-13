import { createHash } from "node:crypto";

import type { DeviceFingerprintPayload } from "@/lib/validators/schemas";

export function normalizeFingerprintPayload(payload: DeviceFingerprintPayload) {
  const macAddresses = [...new Set(payload.macAddresses.map((entry) => entry.toLowerCase()))].sort();

  return {
    androidId: payload.androidId.trim(),
    buildFingerprint: payload.buildFingerprint.trim(),
    board: payload.board.trim(),
    manufacturer: payload.manufacturer.trim(),
    model: payload.model.trim(),
    packageName: payload.packageName.trim(),
    installationId: payload.installationId.trim(),
    macAddresses,
    appVersionName: payload.appVersionName?.trim() ?? null,
    appVersionCode: payload.appVersionCode ?? null,
    customerLabel: payload.customerLabel?.trim() ?? null,
  };
}

export function createDeviceHash(payload: DeviceFingerprintPayload) {
  const normalized = normalizeFingerprintPayload(payload);
  const canonical = JSON.stringify(normalized);
  return createHash("sha256").update(canonical).digest("hex");
}

export function createDeviceSummary(payload: DeviceFingerprintPayload) {
  const normalized = normalizeFingerprintPayload(payload);
  return {
    manufacturer: normalized.manufacturer,
    model: normalized.model,
    board: normalized.board,
    packageName: normalized.packageName,
    appVersionName: normalized.appVersionName,
    appVersionCode: normalized.appVersionCode,
    buildFingerprint: normalized.buildFingerprint,
    macAddresses: normalized.macAddresses,
    customerLabel: normalized.customerLabel,
  };
}
