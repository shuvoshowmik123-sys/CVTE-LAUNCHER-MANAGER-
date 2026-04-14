import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { canApproveRequests, canManageAdmins, canManageSettings } from "@/lib/auth/permissions";
import { createSession, destroySession, getRequestIp, getCurrentSession, invalidateUserSessions, requireSession } from "@/lib/auth/session";
import { createDeviceHash, createDeviceSummary, createMacHash, normalizeFingerprintPayload } from "@/lib/activation/fingerprint";
import { createLicenseHash, createSignedLicense, verifySignedLicense } from "@/lib/activation/license";
import { verifyDeviceRequestSignature } from "@/lib/activation/request-signing";
import { ensureSystemBootstrapped } from "@/lib/bootstrap";
import { db } from "@/lib/db/client";
import {
  activationRequests,
  adminInvocationLocks,
  anomalyFlags,
  auditLogs,
  deviceNotes,
  deviceRegistry,
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
  AnomalyStatus,
  DeviceFingerprintPayload,
  DeviceRequestSignature,
  DeviceRegistryActionPayload,
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
  const [[pending], [active], [revoked], [trackedDevices], [openAnomalies], [adminCount]] = await Promise.all([
    db.select({ value: count() }).from(activationRequests).where(eq(activationRequests.status, "PENDING")),
    db.select({ value: count() }).from(licenses).where(eq(licenses.status, "ACTIVE")),
    db.select({ value: count() }).from(licenses).where(eq(licenses.status, "REVOKED")),
    db.select({ value: count() }).from(deviceRegistry),
    db.select({ value: count() }).from(anomalyFlags).where(eq(anomalyFlags.status, "OPEN")),
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
      trackedDevices: trackedDevices.value,
      openAnomalies: openAnomalies.value,
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

export async function listDeviceRegistry(search?: string) {
  await requireSession();

  const conditions = [];
  if (search?.trim()) {
    const value = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(deviceRegistry.macHash, value),
        ilike(deviceRegistry.primaryMac, value),
        ilike(deviceRegistry.currentDeviceHash, value),
        ilike(deviceRegistry.currentPackageName, value),
        sql`CAST(${deviceRegistry.deviceSummary} AS TEXT) ILIKE ${value}`,
      )!,
    );
  }

  return db
    .select()
    .from(deviceRegistry)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(deviceRegistry.lastSeenAt), desc(deviceRegistry.createdAt));
}

export async function getDeviceDetail(deviceId: string) {
  await requireSession();

  const [device] = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, deviceId)).limit(1);
  if (!device) {
    throw new HttpError(404, "Device record not found.");
  }

  const [requests, deviceLicenses, anomalies, notes] = await Promise.all([
    db.select().from(activationRequests).where(eq(activationRequests.deviceId, deviceId)).orderBy(desc(activationRequests.createdAt)),
    db.select().from(licenses).where(eq(licenses.deviceId, deviceId)).orderBy(desc(licenses.createdAt)),
    db.select().from(anomalyFlags).where(eq(anomalyFlags.deviceId, deviceId)).orderBy(desc(anomalyFlags.createdAt)),
    db.select().from(deviceNotes).where(eq(deviceNotes.deviceId, deviceId)).orderBy(desc(deviceNotes.createdAt)),
  ]);

  return {
    device,
    requests,
    licenses: deviceLicenses,
    anomalies,
    notes,
  };
}

export async function addDeviceNote(deviceId: string, note: string) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to add device notes.");
  }

  const [device] = await db.select({ id: deviceRegistry.id }).from(deviceRegistry).where(eq(deviceRegistry.id, deviceId)).limit(1);
  if (!device) {
    throw new HttpError(404, "Device record not found.");
  }

  const noteId = crypto.randomUUID();
  await db.insert(deviceNotes).values({
    id: noteId,
    deviceId,
    note,
    createdByUserId: session.userId,
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "device.note.add",
    targetType: "device_registry",
    targetId: deviceId,
    metadata: { note },
  });

  return noteId;
}

export async function listAnomalyFlags(status: AnomalyStatus | "ALL" = "OPEN", search?: string) {
  await requireSession();

  const conditions = [];
  if (status !== "ALL") {
    conditions.push(eq(anomalyFlags.status, status));
  }
  if (search?.trim()) {
    const value = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(anomalyFlags.type, value),
        ilike(anomalyFlags.summary, value),
        ilike(deviceRegistry.macHash, value),
        ilike(deviceRegistry.currentDeviceHash, value),
        sql`CAST(${anomalyFlags.metadata} AS TEXT) ILIKE ${value}`,
      )!,
    );
  }

  return db
    .select({
      id: anomalyFlags.id,
      deviceId: anomalyFlags.deviceId,
      requestId: anomalyFlags.requestId,
      licenseId: anomalyFlags.licenseId,
      type: anomalyFlags.type,
      severity: anomalyFlags.severity,
      status: anomalyFlags.status,
      summary: anomalyFlags.summary,
      metadata: anomalyFlags.metadata,
      resolvedByUserId: anomalyFlags.resolvedByUserId,
      resolvedAt: anomalyFlags.resolvedAt,
      createdAt: anomalyFlags.createdAt,
      updatedAt: anomalyFlags.updatedAt,
      macHash: deviceRegistry.macHash,
      currentDeviceHash: deviceRegistry.currentDeviceHash,
      currentPackageName: deviceRegistry.currentPackageName,
      deviceSummary: deviceRegistry.deviceSummary,
    })
    .from(anomalyFlags)
    .leftJoin(deviceRegistry, eq(deviceRegistry.id, anomalyFlags.deviceId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(anomalyFlags.createdAt));
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

export async function blockDevice(deviceId: string, payload: DeviceRegistryActionPayload) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to block devices.");
  }

  const [record] = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, deviceId)).limit(1);
  if (!record) {
    throw new HttpError(404, "Device record not found.");
  }

  const [activeLicense] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.deviceId, deviceId), eq(licenses.status, "ACTIVE")))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .update(deviceRegistry)
      .set({
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedReason: payload.reason,
        currentLicenseId: null,
        unboundAt: new Date(),
        unboundReason: payload.reason,
      })
      .where(eq(deviceRegistry.id, deviceId));

    if (activeLicense) {
      await tx
        .update(licenses)
        .set({
          status: "REVOKED",
          revokedAt: new Date(),
          revokedByUserId: session.userId,
        })
        .where(eq(licenses.id, activeLicense.id));
      await tx
        .update(activationRequests)
        .set({
          status: "REVOKED",
          reviewedAt: new Date(),
          reviewedByUserId: session.userId,
          decisionNote: payload.reason,
        })
        .where(eq(activationRequests.id, activeLicense.requestId));
      await tx.insert(licenseEvents).values({
        id: crypto.randomUUID(),
        licenseId: activeLicense.id,
        requestId: activeLicense.requestId,
        actorUserId: session.userId,
        eventType: "DEVICE_BLOCKED",
        metadata: { reason: payload.reason },
      });
    }
  });

  await openAnomalyFlag({
    deviceId,
    licenseId: activeLicense?.id,
    requestId: activeLicense?.requestId ?? record.lastRequestId ?? undefined,
    type: "device_blocked",
    severity: "CRITICAL",
    summary: "Device was manually blocked by an operator.",
    metadata: { reason: payload.reason },
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "device.block",
    targetType: "device_registry",
    targetId: deviceId,
    metadata: { reason: payload.reason },
  });
}

export async function unbindDevice(deviceId: string, payload: DeviceRegistryActionPayload) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to unbind devices.");
  }

  const [record] = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, deviceId)).limit(1);
  if (!record) {
    throw new HttpError(404, "Device record not found.");
  }

  const [activeLicense] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.deviceId, deviceId), eq(licenses.status, "ACTIVE")))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .update(deviceRegistry)
      .set({
        status: "INACTIVE",
        currentLicenseId: null,
        unboundAt: new Date(),
        unboundReason: payload.reason,
      })
      .where(eq(deviceRegistry.id, deviceId));

    if (activeLicense) {
      await tx
        .update(licenses)
        .set({
          status: "REVOKED",
          revokedAt: new Date(),
          revokedByUserId: session.userId,
        })
        .where(eq(licenses.id, activeLicense.id));
      await tx.insert(licenseEvents).values({
        id: crypto.randomUUID(),
        licenseId: activeLicense.id,
        requestId: activeLicense.requestId,
        actorUserId: session.userId,
        eventType: "DEVICE_UNBOUND",
        metadata: { reason: payload.reason },
      });
    }
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "device.unbind",
    targetType: "device_registry",
    targetId: deviceId,
    metadata: { reason: payload.reason },
  });
}

export async function allowDeviceRebind(deviceId: string, payload: DeviceRegistryActionPayload) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to allow device rebind.");
  }

  const [record] = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, deviceId)).limit(1);
  if (!record) {
    throw new HttpError(404, "Device record not found.");
  }
  if (record.status === "BLOCKED") {
    throw new HttpError(409, "Blocked devices must be unblocked separately before rebind is allowed.");
  }

  await db
    .update(deviceRegistry)
    .set({
      status: "PENDING",
      unboundAt: null,
      unboundReason: null,
      lastSeenAt: new Date(),
    })
    .where(eq(deviceRegistry.id, deviceId));

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "device.allow_rebind",
    targetType: "device_registry",
    targetId: deviceId,
    metadata: { reason: payload.reason },
  });
}

export async function resolveAnomalyFlag(anomalyId: string, note?: string) {
  const session = await requireSession();
  if (!canApproveRequests(session.role)) {
    throw new HttpError(403, "You do not have permission to resolve anomalies.");
  }

  const [flag] = await db.select().from(anomalyFlags).where(eq(anomalyFlags.id, anomalyId)).limit(1);
  if (!flag) {
    throw new HttpError(404, "Anomaly not found.");
  }

  await db
    .update(anomalyFlags)
    .set({
      status: "RESOLVED",
      resolvedByUserId: session.userId,
      resolvedAt: new Date(),
      metadata: {
        ...(flag.metadata ?? {}),
        resolutionNote: note ?? null,
      },
    })
    .where(eq(anomalyFlags.id, anomalyId));

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "anomaly.resolve",
    targetType: "anomaly_flag",
    targetId: anomalyId,
    metadata: { note: note ?? null },
  });
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
  if (!request.deviceId || !request.macHash) {
    throw new HttpError(409, "This request is missing the new device identity fields. Ask the device to register again.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.tokenValidityDays * 24 * 60 * 60 * 1000);
  const licenseId = crypto.randomUUID();
  const token = createSignedLicense({
    ver: 2,
    licenseId,
    keyId: settings.publicKeyId,
    nonce: 1,
    product: "launcher-manager",
    macHash: request.macHash,
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
      deviceId: request.deviceId,
      requestId,
      macHash: request.macHash,
      deviceHash: request.deviceHash,
      product: "launcher-manager",
      packageName: request.packageName,
      tokenVersion: 2,
      keyId: settings.publicKeyId,
      nonce: 1,
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

    if (request.deviceId) {
      await tx.update(deviceRegistry).set({
        status: "ACTIVE",
        currentDeviceHash: request.deviceHash,
        currentPackageName: request.packageName,
        currentLicenseId: licenseId,
        lastRequestId: requestId,
        lastApprovedAt: now,
        unboundAt: null,
        unboundReason: null,
        blockedAt: null,
        blockedReason: null,
        lastSeenAt: now,
      }).where(eq(deviceRegistry.id, request.deviceId));
    }
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorEmail: session.email,
    actorRole: session.role,
    action: "activation.approve",
    targetType: "activation_request",
    targetId: requestId,
    metadata: { licenseId, deviceId: request.deviceId, macHash: request.macHash, deviceHash: request.deviceHash },
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

    if (license.deviceId) {
      await tx
        .update(deviceRegistry)
        .set({
          status: "REVOKED",
          currentLicenseId: null,
          unboundAt: new Date(),
          unboundReason: input.note ?? "License revoked by operator.",
        })
        .where(eq(deviceRegistry.id, license.deviceId));
    }
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
  if (!license.macHash) {
    throw new HttpError(409, "This license predates MAC binding and cannot be reissued automatically.");
  }

  const settings = await getSecuritySettings();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.tokenValidityDays * 24 * 60 * 60 * 1000);
  const token = createSignedLicense({
    ver: 2,
    licenseId: license.id,
    keyId: settings.publicKeyId,
    nonce: (license.nonce ?? 0) + 1,
    product: "launcher-manager",
    macHash: license.macHash,
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
      tokenVersion: 2,
      keyId: settings.publicKeyId,
      nonce: token.nonce,
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

    if (license.deviceId) {
      await tx
        .update(deviceRegistry)
        .set({
          status: "ACTIVE",
          currentLicenseId: license.id,
          blockedAt: null,
          blockedReason: null,
          unboundAt: null,
          unboundReason: null,
          lastApprovedAt: now,
        })
        .where(eq(deviceRegistry.id, license.deviceId));
    }
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

export async function submitActivationRequest(payload: DeviceFingerprintPayload, requestSignature: DeviceRequestSignature) {
  await ensureSystemBootstrapped();
  const settings = await getSecuritySettings();
  if (!settings.activationEnabled) {
    throw new HttpError(503, "Activation is currently disabled.");
  }

  const normalized = normalizeFingerprintPayload(payload);
  const signedFingerprint = toSignedFingerprintPayload(normalized);
  const macHash = createMacHash(payload);
  const deviceHash = createDeviceHash(payload);
  const summary = createDeviceSummary(payload);
  const [registryRecord] = await db
    .select()
    .from(deviceRegistry)
    .where(eq(deviceRegistry.macHash, macHash))
    .limit(1);

  await verifyAndRecordDeviceRequest(
    { fingerprint: signedFingerprint },
    requestSignature,
    registryRecord
      ? {
          id: registryRecord.id,
          requestPublicKeyPem: registryRecord.requestPublicKeyPem,
          lastRequestNonce: registryRecord.lastRequestNonce,
        }
      : null,
  );

  if (registryRecord?.status === "BLOCKED") {
    return {
      status: "BLOCKED" as const,
      deviceId: registryRecord.id,
      reason: registryRecord.blockedReason ?? "This device is blocked.",
    };
  }

  const [activeLicense] = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.macHash, macHash), eq(licenses.status, "ACTIVE")))
    .limit(1);

  if (activeLicense) {
    if (registryRecord && registryRecord.currentDeviceHash && registryRecord.currentDeviceHash !== deviceHash) {
      await openAnomalyFlag({
        deviceId: registryRecord.id,
        licenseId: activeLicense.id,
        type: "device_fingerprint_changed",
        severity: "HIGH",
        summary: "Known MAC submitted a different device fingerprint while an active license exists.",
        metadata: {
          previousDeviceHash: registryRecord.currentDeviceHash,
          newDeviceHash: deviceHash,
          macHash,
        },
      });
    }

    return {
      status: "ACTIVE" as const,
      requestId: activeLicense.requestId,
      deviceId: activeLicense.deviceId,
      license: activeLicense.signedToken as SignedLicenseToken,
    };
  }

  const [pending] = await db
    .select()
    .from(activationRequests)
    .where(and(eq(activationRequests.macHash, macHash), eq(activationRequests.status, "PENDING")))
    .limit(1);

  if (pending) {
    return {
      status: "PENDING" as const,
      requestId: pending.id,
      deviceId: pending.deviceId,
    };
  }

  if (registryRecord && (registryRecord.status === "INACTIVE" || registryRecord.status === "REVOKED")) {
    return {
      status: "REBIND_REQUIRED" as const,
      deviceId: registryRecord.id,
      requestId: registryRecord.lastRequestId,
      reason: registryRecord.unboundReason ?? "This device was previously bound and must be explicitly rebound.",
    };
  }

  const ip = await getRequestIp();
  const requestId = crypto.randomUUID();
  const deviceId = registryRecord?.id ?? crypto.randomUUID();

  await db.transaction(async (tx) => {
    if (!registryRecord) {
      await tx.insert(deviceRegistry).values({
        id: deviceId,
        macHash,
        primaryMac: normalized.primaryMac,
        requestPublicKeyPem: requestSignature.publicKeyPem,
        requestKeyAlgorithm: requestSignature.keyAlgorithm,
        lastRequestNonce: requestSignature.nonce,
        lastRequestSignedAt: new Date(requestSignature.timestamp),
        status: "PENDING",
        currentDeviceHash: deviceHash,
        currentPackageName: normalized.packageName,
        deviceSummary: summary,
        lastSeenAt: new Date(),
      });
    } else {
      await tx.update(deviceRegistry).set({
        status: "PENDING",
        requestPublicKeyPem: requestSignature.publicKeyPem,
        requestKeyAlgorithm: requestSignature.keyAlgorithm,
        lastRequestNonce: requestSignature.nonce,
        lastRequestSignedAt: new Date(requestSignature.timestamp),
        currentDeviceHash: deviceHash,
        currentPackageName: normalized.packageName,
        deviceSummary: summary,
        lastSeenAt: new Date(),
      }).where(eq(deviceRegistry.id, registryRecord.id));
    }

    await tx.insert(activationRequests).values({
      id: requestId,
      deviceId,
      customerLabel: normalized.customerLabel,
      packageName: normalized.packageName,
      appVersionName: normalized.appVersionName,
      appVersionCode: normalized.appVersionCode,
      macHash,
      deviceHash,
      deviceSummary: summary,
      fingerprintPayload: normalized,
      status: "PENDING",
      createdByIp: ip,
    });
  });

  await writeAuditLog({
    action: "device.request_submitted",
    targetType: "activation_request",
    targetId: requestId,
    metadata: { deviceId, macHash, deviceHash, packageName: normalized.packageName, ip },
  });

  return {
    status: "PENDING" as const,
    requestId,
    deviceId,
  };
}

export async function refreshLicense(payload: {
  fingerprint: DeviceFingerprintPayload;
  license: SignedLicenseToken;
  requestSignature: DeviceRequestSignature;
}) {
  await ensureSystemBootstrapped();
  const settings = await getSecuritySettings();
  const signedFingerprint = toSignedFingerprintPayload(normalizeFingerprintPayload(payload.fingerprint));
  const expectedMacHash = createMacHash(payload.fingerprint);
  const expectedHash = createDeviceHash(payload.fingerprint);
  if (expectedMacHash !== payload.license.macHash) {
    throw new HttpError(409, "License MAC binding does not match this device.");
  }
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
  if (!license.macHash) {
    throw new HttpError(409, "This license predates MAC binding and must be reissued by an operator.");
  }
  if (!license.deviceId) {
    throw new HttpError(409, "This license is not linked to a device registry record.");
  }

  const [registryRecord] = await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, license.deviceId)).limit(1);
  if (!registryRecord) {
    throw new HttpError(404, "Device registry record not found.");
  }
  await verifyAndRecordDeviceRequest(
    { fingerprint: signedFingerprint, license: payload.license },
    payload.requestSignature,
    {
      id: registryRecord.id,
      requestPublicKeyPem: registryRecord.requestPublicKeyPem,
      lastRequestNonce: registryRecord.lastRequestNonce,
    },
  );

  const now = new Date();
  const renewalStart = new Date(license.expiresAt.getTime() - settings.renewalWindowDays * 24 * 60 * 60 * 1000);
  if (license.expiresAt > now && renewalStart > now) {
    return license.signedToken as SignedLicenseToken;
  }

  const refreshed = createSignedLicense({
    ver: 2,
    licenseId: license.id,
    keyId: settings.publicKeyId,
    nonce: (license.nonce ?? 0) + 1,
    product: "launcher-manager",
    macHash: license.macHash,
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
      tokenVersion: 2,
      keyId: settings.publicKeyId,
      nonce: refreshed.nonce,
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

export async function verifyDeviceLicense(payload: {
  fingerprint: DeviceFingerprintPayload;
  license: SignedLicenseToken;
  requestSignature: DeviceRequestSignature;
}) {
  await ensureSystemBootstrapped();
  const signedFingerprint = toSignedFingerprintPayload(normalizeFingerprintPayload(payload.fingerprint));
  const expectedMacHash = createMacHash(payload.fingerprint);
  const expectedHash = createDeviceHash(payload.fingerprint);
  const [license] = await db.select().from(licenses).where(eq(licenses.id, payload.license.licenseId)).limit(1);
  const [registryRecord] = license?.deviceId
    ? await db.select().from(deviceRegistry).where(eq(deviceRegistry.id, license.deviceId)).limit(1)
    : [null];
  if (registryRecord) {
    await verifyAndRecordDeviceRequest(
      { fingerprint: signedFingerprint, license: payload.license },
      payload.requestSignature,
      {
        id: registryRecord.id,
        requestPublicKeyPem: registryRecord.requestPublicKeyPem,
        lastRequestNonce: registryRecord.lastRequestNonce,
      },
    );
  }
  const cryptographicallyValid =
    verifySignedLicense(payload.license) &&
    expectedMacHash === payload.license.macHash &&
    expectedHash === payload.license.deviceHash;

  const now = new Date();

  return {
    cryptographicallyValid,
    serverStatus: license?.status ?? "UNKNOWN",
    macMatches: expectedMacHash === payload.license.macHash,
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

function toSignedFingerprintPayload(payload: ReturnType<typeof normalizeFingerprintPayload>): DeviceFingerprintPayload {
  return {
    primaryMac: payload.primaryMac,
    androidId: payload.androidId,
    buildFingerprint: payload.buildFingerprint,
    board: payload.board,
    manufacturer: payload.manufacturer,
    model: payload.model,
    packageName: payload.packageName,
    installationId: payload.installationId,
    macAddresses: payload.macAddresses,
    ...(payload.appVersionName ? { appVersionName: payload.appVersionName } : {}),
    ...(payload.appVersionCode ? { appVersionCode: payload.appVersionCode } : {}),
    ...(payload.customerLabel ? { customerLabel: payload.customerLabel } : {}),
  };
}

async function openAnomalyFlag(input: {
  deviceId?: string;
  requestId?: string;
  licenseId?: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const duplicateConditions = [eq(anomalyFlags.type, input.type), eq(anomalyFlags.status, "OPEN" as AnomalyStatus)];
  if (input.deviceId) {
    duplicateConditions.push(eq(anomalyFlags.deviceId, input.deviceId));
  }
  if (input.licenseId) {
    duplicateConditions.push(eq(anomalyFlags.licenseId, input.licenseId));
  }

  const [existing] = await db
    .select({ id: anomalyFlags.id })
    .from(anomalyFlags)
    .where(and(...duplicateConditions))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(anomalyFlags).values({
    id,
    deviceId: input.deviceId ?? null,
    requestId: input.requestId ?? null,
    licenseId: input.licenseId ?? null,
    type: input.type,
    severity: input.severity,
    status: "OPEN",
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
  return id;
}

async function verifyAndRecordDeviceRequest(
  payload: { fingerprint: DeviceFingerprintPayload; license?: SignedLicenseToken },
  requestSignature: DeviceRequestSignature,
  registryRecord: { id: string; requestPublicKeyPem: string | null; lastRequestNonce: number } | null,
) {
  const signedAt = new Date(requestSignature.timestamp);
  if (Number.isNaN(signedAt.getTime())) {
    throw new HttpError(400, "Request signature timestamp is invalid.");
  }

  const driftMs = Math.abs(Date.now() - signedAt.getTime());
  if (driftMs > 10 * 60 * 1000) {
    throw new HttpError(409, "Request signature is outside the allowed time window.");
  }

  if (registryRecord && requestSignature.nonce <= registryRecord.lastRequestNonce) {
    await openAnomalyFlag({
      deviceId: registryRecord.id,
      licenseId: payload.license?.licenseId,
      type: "device_request_replay",
      severity: "HIGH",
      summary: "A device request used a stale or replayed nonce.",
      metadata: {
        providedNonce: requestSignature.nonce,
        lastRequestNonce: registryRecord.lastRequestNonce,
      },
    });
    throw new HttpError(409, "Request nonce has already been used.");
  }

  const signatureValid = verifyDeviceRequestSignature(payload, requestSignature, registryRecord?.requestPublicKeyPem);
  if (!signatureValid) {
    if (registryRecord) {
      await openAnomalyFlag({
        deviceId: registryRecord.id,
        licenseId: payload.license?.licenseId,
        type: "device_request_signature_invalid",
        severity: "CRITICAL",
        summary: "A device request failed cryptographic signature verification.",
        metadata: {
          nonce: requestSignature.nonce,
          keyAlgorithm: requestSignature.keyAlgorithm,
        },
      });
    }
    throw new HttpError(401, "Device request signature is invalid.");
  }

  if (registryRecord) {
    await db
      .update(deviceRegistry)
      .set({
        requestPublicKeyPem: requestSignature.publicKeyPem,
        requestKeyAlgorithm: requestSignature.keyAlgorithm,
        lastRequestNonce: requestSignature.nonce,
        lastRequestSignedAt: signedAt,
      })
      .where(eq(deviceRegistry.id, registryRecord.id));
  }
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
      ilike(activationRequests.macHash, value),
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
