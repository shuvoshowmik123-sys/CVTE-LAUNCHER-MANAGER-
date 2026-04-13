import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { canApproveRequests, canManageAdmins, canManageSettings } from "@/lib/auth/permissions";
import { createSession, destroySession, getRequestIp, getCurrentSession, invalidateUserSessions, requireSession } from "@/lib/auth/session";
import { createDeviceHash, createDeviceSummary, normalizeFingerprintPayload } from "@/lib/activation/fingerprint";
import { createLicenseHash, createSignedLicense, verifySignedLicense } from "@/lib/activation/license";
import { ensureSystemBootstrapped } from "@/lib/bootstrap";
import { db } from "@/lib/db/client";
import {
  activationRequests,
  adminInvocationLocks,
  auditLogs,
  licenseEvents,
  licenses,
  securitySettings,
  users,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http/errors";
import type {
  AdminCreatePayload,
  AdminStatusUpdatePayload,
  DeviceFingerprintPayload,
  SignedLicenseToken,
} from "@/lib/validators/schemas";

const LOGIN_ACTION = "login";

export async function loginAdmin(email: string, password: string) {
  await ensureSystemBootstrapped();

  const normalizedEmail = email.toLowerCase().trim();
  const ip = await getRequestIp();
  const lock = await getInvocationLock(normalizedEmail, ip, LOGIN_ACTION);
  if (lock.lockedUntil && lock.lockedUntil > new Date()) {
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: "auth.login.locked",
      targetType: "session",
      metadata: { ip, lockedUntil: lock.lockedUntil.toISOString() },
    });
    throw new HttpError(429, "Too many failed attempts. Try again later.");
  }

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!user || user.status === "DISABLED" || !(await verifyPassword(password, user.passwordHash))) {
    await registerFailedInvocation(normalizedEmail, ip, LOGIN_ACTION);
    await writeAuditLog({
      actorEmail: normalizedEmail,
      actorRole: user?.role ?? null,
      actorUserId: user?.id ?? null,
      action: "auth.login.failure",
      targetType: "session",
      metadata: { ip },
    });
    throw new HttpError(401, "Invalid email or password.");
  }

  await clearInvocationLock(normalizedEmail, ip, LOGIN_ACTION);
  await createSession(user.id);
  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: "auth.login.success",
    targetType: "session",
    metadata: { ip },
  });

  return {
    forcePasswordReset: user.forcePasswordReset,
    user: safeUser(user),
  };
}

export async function logoutAdmin() {
  const session = await getCurrentSession();
  await destroySession();
  if (session) {
    await writeAuditLog({
      actorUserId: session.userId,
      actorEmail: session.email,
      actorRole: session.role,
      action: "auth.logout",
      targetType: "session",
      metadata: {},
    });
  }
}

export async function updateOwnPassword(newPassword: string) {
  const session = await requireSession();
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({
      passwordHash,
      forcePasswordReset: false,
      status: "ACTIVE",
    })
    .where(eq(users.id, session.userId));

  await invalidateUserSessions(session.userId);
  await createSession(session.userId);
  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "auth.password.rotate",
    targetType: "user",
    targetId: session.userId,
    metadata: {},
  });
}

export async function listAdmins() {
  await requireSession();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      forcePasswordReset: users.forcePasswordReset,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.role, users.name);
}

export async function createAdminAccount(payload: AdminCreatePayload) {
  const session = await requireSession();
  if (!canManageAdmins(session.role)) {
    throw new HttpError(403, "Only the super admin can manage admin users.");
  }

  const existing = await db.select().from(users).where(eq(users.email, payload.email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    throw new HttpError(409, "That email is already in use.");
  }

  const temporaryPassword = randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(temporaryPassword);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: payload.role,
    status: "ACTIVE",
    forcePasswordReset: true,
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "admin.create",
    targetType: "user",
    targetId: id,
    metadata: { email: payload.email.toLowerCase(), role: payload.role },
  });

  return {
    temporaryPassword,
    user: {
      id,
      name: payload.name,
      email: payload.email.toLowerCase(),
      role: payload.role,
      status: "ACTIVE",
      forcePasswordReset: true,
    },
  };
}

export async function disableAdminAccount(userId: string, payload: AdminStatusUpdatePayload) {
  const session = await requireSession();
  if (!canManageAdmins(session.role)) {
    throw new HttpError(403, "Only the super admin can manage admin users.");
  }

  if (session.userId === userId) {
    throw new HttpError(400, "You cannot disable your own account.");
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    throw new HttpError(404, "Admin user not found.");
  }

  await db.update(users).set({ status: "DISABLED" }).where(eq(users.id, userId));
  await invalidateUserSessions(userId);
  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "admin.disable",
    targetType: "user",
    targetId: userId,
    metadata: { reason: payload.reason ?? null, email: target.email },
  });
}

export async function resetAdminPassword(userId: string, payload: AdminStatusUpdatePayload) {
  const session = await requireSession();
  if (!canManageAdmins(session.role)) {
    throw new HttpError(403, "Only the super admin can reset admin passwords.");
  }

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) {
    throw new HttpError(404, "Admin user not found.");
  }

  const temporaryPassword = randomBytes(12).toString("base64url");
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(temporaryPassword),
      forcePasswordReset: true,
      status: "ACTIVE",
    })
    .where(eq(users.id, userId));
  await invalidateUserSessions(userId);

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "admin.reset_password",
    targetType: "user",
    targetId: userId,
    metadata: { reason: payload.reason ?? null, email: target.email },
  });

  return { temporaryPassword };
}

export async function getDashboardMetrics() {
  const session = await requireSession();
  const [[pending], [active], [revoked], [adminCount]] = await Promise.all([
    db.select({ value: count() }).from(activationRequests).where(eq(activationRequests.status, "PENDING")),
    db.select({ value: count() }).from(licenses).where(eq(licenses.status, "ACTIVE")),
    db.select({ value: count() }).from(licenses).where(eq(licenses.status, "REVOKED")),
    db.select({ value: count() }).from(users),
  ]);

  const recentAudit = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8);
  const settings = await getSecuritySettings();

  return {
    currentUser: session,
    metrics: {
      pendingActivations: pending.value,
      activeLicenses: active.value,
      revokedLicenses: revoked.value,
      adminUsers: adminCount.value,
    },
    recentAudit,
    settings,
  };
}

export async function listActivationRequests(status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED", search?: string) {
  await requireSession();
  const where = buildActivationSearch(status, search);
  return db
    .select()
    .from(activationRequests)
    .where(where)
    .orderBy(desc(activationRequests.createdAt));
}

export async function listLicenses(status: "ACTIVE" | "REVOKED", search?: string) {
  await requireSession();
  const conditions = [eq(licenses.status, status)];
  if (search?.trim()) {
    const value = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(licenses.deviceHash, value),
        ilike(licenses.packageName, value),
        ilike(activationRequests.customerLabel, value),
      )!,
    );
  }

  return db
    .select({
      id: licenses.id,
      deviceHash: licenses.deviceHash,
      packageName: licenses.packageName,
      product: licenses.product,
      status: licenses.status,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      revokedAt: licenses.revokedAt,
      customerLabel: activationRequests.customerLabel,
      deviceSummary: activationRequests.deviceSummary,
      requestId: activationRequests.id,
    })
    .from(licenses)
    .innerJoin(activationRequests, eq(activationRequests.id, licenses.requestId))
    .where(and(...conditions))
    .orderBy(desc(licenses.updatedAt));
}

export async function exportLicensesCsv(status: "ACTIVE" | "REVOKED") {
  const rows = await listLicenses(status);
  const header = [
    "licenseId",
    "deviceHash",
    "packageName",
    "status",
    "issuedAt",
    "expiresAt",
    "customerLabel",
    "model",
    "manufacturer",
    "board",
  ];

  const lines = rows.map((row) => {
    const summary = row.deviceSummary as Record<string, string | null>;
    return [
      row.id,
      row.deviceHash,
      row.packageName,
      row.status,
      row.issuedAt.toISOString(),
      row.expiresAt.toISOString(),
      row.customerLabel ?? "",
      summary.model ?? "",
      summary.manufacturer ?? "",
      summary.board ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header.join(","), ...lines].join("\n");
}

export async function approveActivationRequest(
  requestId: string,
  input: { note?: string; features?: string[] },
) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to approve activation requests.");
  }

  const settings = await getSecuritySettings();
  if (!settings.activationEnabled) {
    throw new HttpError(409, "Activation is currently disabled.");
  }
  if (!settings.allowAdminApprovals && session.role !== "SUPER_ADMIN") {
    throw new HttpError(403, "Only the super admin can approve requests right now.");
  }

  const [request] = await db.select().from(activationRequests).where(eq(activationRequests.id, requestId)).limit(1);
  if (!request) {
    throw new HttpError(404, "Activation request not found.");
  }
  if (request.status !== "PENDING") {
    throw new HttpError(409, "Only pending requests can be approved.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.tokenValidityDays * 24 * 60 * 60 * 1000);
  const licenseId = crypto.randomUUID();
  const token = createSignedLicense({
    ver: 1,
    licenseId,
    product: "launcher-manager",
    deviceHash: request.deviceHash,
    packageName: request.packageName,
    features: input.features?.length ? input.features : ["activation", "offline-license"],
    issuedAt: now.toISOString(),
    notBefore: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    issuer: settings.issuer,
  });

  await db.transaction(async (tx) => {
    await tx.update(activationRequests).set({
      status: "APPROVED",
      decisionNote: input.note ?? null,
      reviewedAt: now,
      reviewedByUserId: session.userId,
    }).where(eq(activationRequests.id, requestId));

    await tx.insert(licenses).values({
      id: licenseId,
      requestId,
      deviceHash: request.deviceHash,
      product: "launcher-manager",
      packageName: request.packageName,
      tokenVersion: 1,
      tokenHash: createLicenseHash(token),
      signedToken: token,
      status: "ACTIVE",
      features: token.features,
      issuedAt: now,
      notBefore: now,
      expiresAt,
    });

    await tx.insert(licenseEvents).values({
      id: crypto.randomUUID(),
      licenseId,
      requestId,
      actorUserId: session.userId,
      eventType: "ISSUED",
      metadata: { features: token.features, note: input.note ?? null },
    });
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "activation.approve",
    targetType: "activation_request",
    targetId: requestId,
    metadata: { licenseId, deviceHash: request.deviceHash },
  });

  return token;
}

export async function rejectActivationRequest(requestId: string, input: { note?: string }) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to reject activation requests.");
  }

  const [request] = await db.select().from(activationRequests).where(eq(activationRequests.id, requestId)).limit(1);
  if (!request) {
    throw new HttpError(404, "Activation request not found.");
  }

  await db.update(activationRequests).set({
    status: "REJECTED",
    decisionNote: input.note ?? null,
    reviewedAt: new Date(),
    reviewedByUserId: session.userId,
  }).where(eq(activationRequests.id, requestId));

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "activation.reject",
    targetType: "activation_request",
    targetId: requestId,
    metadata: { note: input.note ?? null },
  });
}

export async function revokeLicense(licenseId: string, input: { note?: string }) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to revoke licenses.");
  }

  const [license] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!license) {
    throw new HttpError(404, "License not found.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(licenses)
      .set({ status: "REVOKED", revokedAt: new Date(), revokedByUserId: session.userId })
      .where(eq(licenses.id, licenseId));
    await tx
      .update(activationRequests)
      .set({ status: "REVOKED", reviewedAt: new Date(), reviewedByUserId: session.userId })
      .where(eq(activationRequests.id, license.requestId));
    await tx.insert(licenseEvents).values({
      id: crypto.randomUUID(),
      licenseId,
      requestId: license.requestId,
      actorUserId: session.userId,
      eventType: "REVOKED",
      metadata: { note: input.note ?? null },
    });
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "license.revoke",
    targetType: "license",
    targetId: licenseId,
    metadata: { note: input.note ?? null },
  });
}

export async function reissueLicense(licenseId: string, input: { note?: string }) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to reissue licenses.");
  }

  const [license] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!license) {
    throw new HttpError(404, "License not found.");
  }

  const settings = await getSecuritySettings();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.tokenValidityDays * 24 * 60 * 60 * 1000);
  const token = createSignedLicense({
    ver: 1,
    licenseId: license.id,
    product: "launcher-manager",
    deviceHash: license.deviceHash,
    packageName: license.packageName,
    features: license.features,
    issuedAt: now.toISOString(),
    notBefore: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    issuer: settings.issuer,
  });

  await db.transaction(async (tx) => {
    await tx.update(licenses).set({
      tokenHash: createLicenseHash(token),
      signedToken: token,
      status: "ACTIVE",
      issuedAt: now,
      notBefore: now,
      expiresAt,
      revokedAt: null,
      revokedByUserId: null,
    }).where(eq(licenses.id, licenseId));

    await tx.insert(licenseEvents).values({
      id: crypto.randomUUID(),
      licenseId,
      requestId: license.requestId,
      actorUserId: session.userId,
      eventType: "REISSUED",
      metadata: { note: input.note ?? null },
    });
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "license.reissue",
    targetType: "license",
    targetId: licenseId,
    metadata: { note: input.note ?? null },
  });

  return token;
}

export async function getLicenseRecord(licenseId: string) {
  await requireSession();
  const [license] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!license) {
    throw new HttpError(404, "License not found.");
  }
  return license;
}

export async function listAuditEntries(search?: string) {
  await requireSession();
  const query = db.select().from(auditLogs);
  if (!search?.trim()) {
    return query.orderBy(desc(auditLogs.createdAt)).limit(200);
  }

  const likeValue = `%${search.trim()}%`;
  return db
    .select()
    .from(auditLogs)
    .where(
      or(
        ilike(auditLogs.action, likeValue),
        ilike(auditLogs.actorEmail, likeValue),
        ilike(auditLogs.targetType, likeValue),
        ilike(auditLogs.targetId, likeValue),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);
}

export async function getSecuritySettings() {
  await ensureSystemBootstrapped();
  const [settings] = await db.select().from(securitySettings).where(eq(securitySettings.id, "global")).limit(1);
  if (!settings) {
    throw new HttpError(500, "Security settings were not initialized.");
  }
  return settings;
}

export async function updateSecuritySettings(input: {
  issuer: string;
  tokenValidityDays: number;
  renewalWindowDays: number;
  activationEnabled: boolean;
  allowAdminApprovals: boolean;
}) {
  const session = await requireSession();
  if (!canManageSettings(session.role)) {
    throw new HttpError(403, "Only the super admin can manage security settings.");
  }

  const settings = await getSecuritySettings();
  await db
    .update(securitySettings)
    .set({
      issuer: input.issuer,
      tokenValidityDays: input.tokenValidityDays,
      renewalWindowDays: input.renewalWindowDays,
      activationEnabled: input.activationEnabled,
      allowAdminApprovals: input.allowAdminApprovals,
      updatedByUserId: session.userId,
    })
    .where(eq(securitySettings.id, settings.id));

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "security_settings.update",
    targetType: "security_settings",
    targetId: settings.id,
    metadata: input,
  });
}

export async function submitActivationRequest(payload: DeviceFingerprintPayload) {
  await ensureSystemBootstrapped();
  const settings = await getSecuritySettings();
  if (!settings.activationEnabled) {
    throw new HttpError(503, "Activation is currently disabled.");
  }

  const normalized = normalizeFingerprintPayload(payload);
  const deviceHash = createDeviceHash(payload);
  const [activeLicense] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.deviceHash, deviceHash), eq(licenses.status, "ACTIVE")))
    .limit(1);

  if (activeLicense) {
    return {
      status: "ACTIVE" as const,
      requestId: activeLicense.requestId,
      license: activeLicense.signedToken as SignedLicenseToken,
    };
  }

  const [pending] = await db
    .select()
    .from(activationRequests)
    .where(and(eq(activationRequests.deviceHash, deviceHash), eq(activationRequests.status, "PENDING")))
    .limit(1);

  if (pending) {
    return {
      status: "PENDING" as const,
      requestId: pending.id,
    };
  }

  const ip = await getRequestIp();
  const id = crypto.randomUUID();
  await db.insert(activationRequests).values({
    id,
    customerLabel: normalized.customerLabel,
    packageName: normalized.packageName,
    appVersionName: normalized.appVersionName,
    appVersionCode: normalized.appVersionCode,
    deviceHash,
    deviceSummary: createDeviceSummary(payload),
    fingerprintPayload: normalized,
    status: "PENDING",
    createdByIp: ip,
  });

  await writeAuditLog({
    action: "device.request_submitted",
    targetType: "activation_request",
    targetId: id,
    metadata: { deviceHash, packageName: normalized.packageName, ip },
  });

  return {
    status: "PENDING" as const,
    requestId: id,
  };
}

export async function refreshLicense(payload: { fingerprint: DeviceFingerprintPayload; license: SignedLicenseToken }) {
  await ensureSystemBootstrapped();
  const settings = await getSecuritySettings();
  const expectedHash = createDeviceHash(payload.fingerprint);
  if (expectedHash !== payload.license.deviceHash) {
    throw new HttpError(409, "License does not match this device.");
  }

  if (!verifySignedLicense(payload.license)) {
    throw new HttpError(400, "License signature is invalid.");
  }

  const [license] = await db.select().from(licenses).where(eq(licenses.id, payload.license.licenseId)).limit(1);
  if (!license || license.status === "REVOKED") {
    throw new HttpError(403, "License is not active.");
  }

  const now = new Date();
  const renewalStart = new Date(license.expiresAt.getTime() - settings.renewalWindowDays * 24 * 60 * 60 * 1000);
  if (license.expiresAt > now && renewalStart > now) {
    return license.signedToken as SignedLicenseToken;
  }

  const refreshed = createSignedLicense({
    ver: 1,
    licenseId: license.id,
    product: "launcher-manager",
    deviceHash: license.deviceHash,
    packageName: license.packageName,
    features: license.features,
    issuedAt: now.toISOString(),
    notBefore: now.toISOString(),
    expiresAt: new Date(now.getTime() + settings.tokenValidityDays * 24 * 60 * 60 * 1000).toISOString(),
    issuer: settings.issuer,
  });

  await db.transaction(async (tx) => {
    await tx.update(licenses).set({
      signedToken: refreshed,
      tokenHash: createLicenseHash(refreshed),
      status: "ACTIVE",
      issuedAt: now,
      notBefore: now,
      expiresAt: new Date(refreshed.expiresAt),
    }).where(eq(licenses.id, license.id));
    await tx.insert(licenseEvents).values({
      id: crypto.randomUUID(),
      licenseId: license.id,
      requestId: license.requestId,
      actorUserId: null,
      eventType: "REFRESHED",
      metadata: {},
    });
  });

  return refreshed;
}

export async function verifyDeviceLicense(payload: { fingerprint: DeviceFingerprintPayload; license: SignedLicenseToken }) {
  await ensureSystemBootstrapped();
  const expectedHash = createDeviceHash(payload.fingerprint);
  const cryptographicallyValid =
    verifySignedLicense(payload.license) && expectedHash === payload.license.deviceHash;

  const [license] = await db.select().from(licenses).where(eq(licenses.id, payload.license.licenseId)).limit(1);
  const now = new Date();

  return {
    cryptographicallyValid,
    serverStatus: license?.status ?? "UNKNOWN",
    deviceMatches: expectedHash === payload.license.deviceHash,
    expired: new Date(payload.license.expiresAt) <= now,
    active: Boolean(license && license.status === "ACTIVE"),
  };
}

function safeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    forcePasswordReset: user.forcePasswordReset,
  };
}

async function getInvocationLock(email: string, ip: string, action: string) {
  const key = createInvocationKey(email, ip, action);
  const [lock] = await db.select().from(adminInvocationLocks).where(eq(adminInvocationLocks.key, key)).limit(1);
  return lock ?? { key, action, attempts: 0, lockedUntil: null };
}

async function registerFailedInvocation(email: string, ip: string, action: string) {
  const env = getEnv();
  const key = createInvocationKey(email, ip, action);
  const current = await getInvocationLock(email, ip, action);
  const attempts = current.attempts + 1;
  const lockedUntil =
    attempts >= env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS
      ? new Date(Date.now() + env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)
      : null;

  await db
    .insert(adminInvocationLocks)
    .values({
      key,
      action,
      attempts,
      lockedUntil,
      lastAttemptAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminInvocationLocks.key,
      set: {
        attempts,
        lockedUntil,
        lastAttemptAt: new Date(),
      },
    });
}

async function clearInvocationLock(email: string, ip: string, action: string) {
  const key = createInvocationKey(email, ip, action);
  await db.delete(adminInvocationLocks).where(eq(adminInvocationLocks.key, key));
}

function createInvocationKey(email: string, ip: string, action: string) {
  return createHash("sha256").update(`${action}:${email}:${ip}`).digest("hex");
}

function buildActivationSearch(status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED", search?: string) {
  const base = [eq(activationRequests.status, status)];
  if (!search?.trim()) {
    return and(...base);
  }

  const value = `%${search.trim()}%`;
  return and(
    ...base,
    or(
      ilike(activationRequests.deviceHash, value),
      ilike(activationRequests.packageName, value),
      ilike(activationRequests.customerLabel, value),
      sql`CAST(${activationRequests.deviceSummary} AS TEXT) ILIKE ${value}`,
    ),
  );
}

function csvEscape(value: string) {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}
