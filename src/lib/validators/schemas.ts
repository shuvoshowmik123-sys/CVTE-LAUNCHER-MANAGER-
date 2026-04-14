import { z } from "zod";

export const userRoleSchema = z.enum(["SUPER_ADMIN", "ADMIN"]);
export const userStatusSchema = z.enum(["ACTIVE", "DISABLED", "PENDING_RESET"]);
export const activationRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
]);
export const licenseStatusSchema = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);
export const deviceRegistryStatusSchema = z.enum(["PENDING", "ACTIVE", "INACTIVE", "REVOKED", "BLOCKED"]);
export const anomalySeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const anomalyStatusSchema = z.enum(["OPEN", "RESOLVED"]);

const macAddressSchema = z
  .string()
  .trim()
  .regex(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i, "Invalid MAC address")
  .transform((value) => value.toLowerCase().replace(/-/g, ":"));

export const deviceFingerprintPayloadSchema = z.object({
  primaryMac: macAddressSchema,
  androidId: z.string().trim().min(1),
  buildFingerprint: z.string().trim().min(1),
  board: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  model: z.string().trim().min(1),
  packageName: z.string().trim().min(1),
  installationId: z.string().trim().min(1),
  macAddresses: z.array(macAddressSchema).default([]),
  appVersionName: z.string().trim().min(1).optional(),
  appVersionCode: z.coerce.number().int().positive().optional(),
  customerLabel: z.string().trim().max(120).optional(),
});

export const activationRequestPayloadSchema = z.object({
  fingerprint: deviceFingerprintPayloadSchema,
  requestSignature: z.object({
    version: z.literal(1),
    keyAlgorithm: z.literal("ES256"),
    publicKeyPem: z.string().trim().min(1),
    nonce: z.coerce.number().int().positive(),
    timestamp: z.string().datetime(),
    signature: z.string().trim().min(1),
  }),
});

export const signedLicenseTokenSchema = z.object({
  ver: z.literal(2),
  licenseId: z.string().min(1),
  keyId: z.string().min(1),
  nonce: z.coerce.number().int().positive(),
  product: z.literal("launcher-manager"),
  macHash: z.string().min(1),
  deviceHash: z.string().min(1),
  packageName: z.string().min(1),
  features: z.array(z.string().min(1)),
  issuedAt: z.string().datetime(),
  notBefore: z.string().datetime(),
  expiresAt: z.string().datetime(),
  issuer: z.string().min(1),
  signature: z.string().min(1),
});

export const licenseRefreshPayloadSchema = z.object({
  fingerprint: deviceFingerprintPayloadSchema,
  license: signedLicenseTokenSchema,
  requestSignature: z.object({
    version: z.literal(1),
    keyAlgorithm: z.literal("ES256"),
    publicKeyPem: z.string().trim().min(1),
    nonce: z.coerce.number().int().positive(),
    timestamp: z.string().datetime(),
    signature: z.string().trim().min(1),
  }),
});

export const licenseVerifyPayloadSchema = z.object({
  fingerprint: deviceFingerprintPayloadSchema,
  license: signedLicenseTokenSchema,
  requestSignature: z.object({
    version: z.literal(1),
    keyAlgorithm: z.literal("ES256"),
    publicKeyPem: z.string().trim().min(1),
    nonce: z.coerce.number().int().positive(),
    timestamp: z.string().datetime(),
    signature: z.string().trim().min(1),
  }),
});

export const adminLoginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminCreatePayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  role: userRoleSchema,
});

export const adminStatusUpdatePayloadSchema = z.object({
  reason: z.string().trim().max(240).optional(),
});

export const deviceRegistryActionPayloadSchema = z.object({
  reason: z.string().trim().min(3).max(240),
});

export const deviceNotePayloadSchema = z.object({
  note: z.string().trim().min(3).max(2000),
});

export const activationDecisionPayloadSchema = z.object({
  note: z.string().trim().max(240).optional(),
  features: z.array(z.string().trim().min(1)).default(["activation", "offline-license"]),
});

export const settingsUpdatePayloadSchema = z.object({
  issuer: z.string().trim().min(1).max(120),
  tokenValidityDays: z.coerce.number().int().positive().max(3650),
  renewalWindowDays: z.coerce.number().int().positive().max(3650),
  activationEnabled: z.boolean(),
  allowAdminApprovals: z.boolean(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type ActivationRequestStatus = z.infer<typeof activationRequestStatusSchema>;
export type LicenseStatus = z.infer<typeof licenseStatusSchema>;
export type DeviceRegistryStatus = z.infer<typeof deviceRegistryStatusSchema>;
export type AnomalySeverity = z.infer<typeof anomalySeveritySchema>;
export type AnomalyStatus = z.infer<typeof anomalyStatusSchema>;
export type DeviceFingerprintPayload = z.infer<typeof deviceFingerprintPayloadSchema>;
export type ActivationRequestPayload = z.infer<typeof activationRequestPayloadSchema>;
export type SignedLicenseToken = z.infer<typeof signedLicenseTokenSchema>;
export type DeviceRequestSignature = z.infer<typeof activationRequestPayloadSchema>["requestSignature"];
export type AuditLogEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
export type AdminCreatePayload = z.infer<typeof adminCreatePayloadSchema>;
export type AdminStatusUpdatePayload = z.infer<typeof adminStatusUpdatePayloadSchema>;
export type DeviceRegistryActionPayload = z.infer<typeof deviceRegistryActionPayloadSchema>;
export type DeviceNotePayload = z.infer<typeof deviceNotePayloadSchema>;
