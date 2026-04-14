import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "DISABLED", "PENDING_RESET"]);
export const activationRequestStatusEnum = pgEnum("activation_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
]);
export const licenseStatusEnum = pgEnum("license_status", ["ACTIVE", "EXPIRED", "REVOKED"]);
export const deviceRegistryStatusEnum = pgEnum("device_registry_status", [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "REVOKED",
  "BLOCKED",
]);
export const anomalySeverityEnum = pgEnum("anomaly_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const anomalyStatusEnum = pgEnum("anomaly_status", ["OPEN", "RESOLVED"]);

export const deviceRegistry = pgTable(
  "device_registry",
  {
    id: text("id").primaryKey(),
    macHash: text("mac_hash").notNull(),
    primaryMac: text("primary_mac").notNull(),
    requestPublicKeyPem: text("request_public_key_pem"),
    requestKeyAlgorithm: text("request_key_algorithm"),
    lastRequestNonce: integer("last_request_nonce").notNull().default(0),
    lastRequestSignedAt: timestamp("last_request_signed_at", { withTimezone: true }),
    status: deviceRegistryStatusEnum("status").notNull().default("PENDING"),
    currentDeviceHash: text("current_device_hash"),
    currentPackageName: text("current_package_name"),
    currentLicenseId: text("current_license_id"),
    lastRequestId: text("last_request_id"),
    deviceSummary: jsonb("device_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    blockedReason: text("blocked_reason"),
    unboundReason: text("unbound_reason"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastApprovedAt: timestamp("last_approved_at", { withTimezone: true }),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    unboundAt: timestamp("unbound_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    macUnique: uniqueIndex("device_registry_mac_hash_unique").on(table.macHash),
    statusIdx: index("device_registry_status_idx").on(table.status),
  }),
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    forcePasswordReset: boolean("force_password_reset").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    csrfSecretHash: text("csrf_secret_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("sessions_session_token_hash_unique").on(table.sessionTokenHash),
    userIdx: index("sessions_user_idx").on(table.userId),
  }),
);

export const activationRequests = pgTable(
  "activation_requests",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").references(() => deviceRegistry.id, { onDelete: "set null" }),
    customerLabel: text("customer_label"),
    packageName: text("package_name").notNull(),
    appVersionName: text("app_version_name"),
    appVersionCode: integer("app_version_code"),
    macHash: text("mac_hash"),
    deviceHash: text("device_hash").notNull(),
    deviceSummary: jsonb("device_summary").$type<Record<string, unknown>>().notNull(),
    fingerprintPayload: jsonb("fingerprint_payload").$type<Record<string, unknown>>().notNull(),
    status: activationRequestStatusEnum("status").notNull().default("PENDING"),
    decisionNote: text("decision_note"),
    createdByIp: text("created_by_ip"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    deviceIdx: index("activation_requests_device_id_idx").on(table.deviceId),
    macHashIdx: index("activation_requests_mac_hash_idx").on(table.macHash),
    hashIdx: index("activation_requests_device_hash_idx").on(table.deviceHash),
    statusIdx: index("activation_requests_status_idx").on(table.status),
  }),
);

export const licenses = pgTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").references(() => deviceRegistry.id, { onDelete: "cascade" }),
    requestId: text("request_id")
      .notNull()
      .references(() => activationRequests.id, { onDelete: "cascade" }),
    macHash: text("mac_hash"),
    deviceHash: text("device_hash").notNull(),
    product: text("product").notNull(),
    packageName: text("package_name").notNull(),
    tokenVersion: integer("token_version").notNull().default(2),
    keyId: text("key_id"),
    nonce: integer("nonce").notNull().default(1),
    tokenHash: text("token_hash").notNull(),
    signedToken: jsonb("signed_token").$type<Record<string, unknown>>().notNull(),
    status: licenseStatusEnum("status").notNull().default("ACTIVE"),
    features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    notBefore: timestamp("not_before", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    registryIdx: index("licenses_device_id_idx").on(table.deviceId),
    macIdx: index("licenses_mac_hash_idx").on(table.macHash),
    deviceIdx: index("licenses_device_hash_idx").on(table.deviceHash),
    requestIdx: index("licenses_request_id_idx").on(table.requestId),
    tokenHashUnique: uniqueIndex("licenses_token_hash_unique").on(table.tokenHash),
  }),
);

export const licenseEvents = pgTable("license_events", {
  id: text("id").primaryKey(),
  licenseId: text("license_id")
    .notNull()
    .references(() => licenses.id, { onDelete: "cascade" }),
  requestId: text("request_id").references(() => activationRequests.id, { onDelete: "set null" }),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    actorRole: userRoleEnum("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export const securitySettings = pgTable("security_settings", {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  tokenValidityDays: integer("token_validity_days").notNull(),
  renewalWindowDays: integer("renewal_window_days").notNull(),
  activationEnabled: boolean("activation_enabled").notNull().default(true),
  allowAdminApprovals: boolean("allow_admin_approvals").notNull().default(true),
  publicKeyId: text("public_key_id").notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const adminInvocationLocks = pgTable(
  "admin_invocation_locks",
  {
    key: text("key").primaryKey(),
    action: text("action").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    actionIdx: index("admin_invocation_locks_action_idx").on(table.action),
  }),
);

export const anomalyFlags = pgTable(
  "anomaly_flags",
  {
    id: text("id").primaryKey(),
    deviceId: text("device_id").references(() => deviceRegistry.id, { onDelete: "cascade" }),
    requestId: text("request_id").references(() => activationRequests.id, { onDelete: "set null" }),
    licenseId: text("license_id").references(() => licenses.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    severity: anomalySeverityEnum("severity").notNull().default("MEDIUM"),
    status: anomalyStatusEnum("status").notNull().default("OPEN"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    resolvedByUserId: text("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    deviceIdx: index("anomaly_flags_device_idx").on(table.deviceId),
    requestIdx: index("anomaly_flags_request_idx").on(table.requestId),
    statusIdx: index("anomaly_flags_status_idx").on(table.status),
    severityIdx: index("anomaly_flags_severity_idx").on(table.severity),
  }),
);

export const deviceNotes = pgTable("device_notes", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => deviceRegistry.id, { onDelete: "cascade" }),
  requestId: text("request_id").references(() => activationRequests.id, {
    onDelete: "cascade",
  }),
  licenseId: text("license_id").references(() => licenses.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
