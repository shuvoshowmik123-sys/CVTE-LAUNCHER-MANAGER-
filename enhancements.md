# Activation System Enhancement Plan

> **Date:** 2026-04-14
> **Scope:** CBT Launcher Manager APK + Activation Server
> **Goal:** MAC-based device binding, tamper-resistant APK, hardened server, impenetrable licensing system

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Identified Problems & Vulnerabilities](#2-identified-problems--vulnerabilities)
3. [Proposed Architecture: MAC-Based Device Binding](#3-proposed-architecture-mac-based-device-binding)
4. [Database Schema Changes](#4-database-schema-changes)
5. [API Changes](#5-api-changes)
6. [APK Security Hardening](#6-apk-security-hardening)
7. [Server Security Hardening](#7-server-security-hardening)
8. [Admin Dashboard Enhancements](#8-admin-dashboard-enhancements)
9. [Implementation Priority & Timeline](#9-implementation-priority--timeline)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Current State Analysis

### 1.1 CBT Launcher Manager APK

**Location:** `E:\motherboard firmware modifier\cbt-launcher-manager\`

**Tech Stack:**
- Java 11, minSdk 24, targetSdk 30, compileSdk 34
- AndroidX Leanback (GuidedStepSupportFragment for TV UI)
- Custom ADB-over-TCP client (raw TCP sockets to localhost:5555)
- RSA-2048 keypair for ADB authentication
- SharedPreferences for persistence

**Core Capabilities:**
1. Stock launcher replacement (detects all HOME/LEANBACK_LAUNCHER apps, disables stock via ADB)
2. CVTE boot-loop watchdog neutralization (deletes reboot flag, blocks `tvweb.cvtapi.com` via `/etc/hosts`, sets HOME activity)
3. Boot persistence via `BootReceiver` (counters `/system/bin/tvapiservice`)
4. System debloat (118 packages, ~80 MB RAM freed)
5. Factory menu lock/unlock (Menu+1147)

**Package Structure:**
```
app/src/main/java/com/wolf/google/lm/
├── adb/
│   ├── AdbPacket.java          # ADB protocol packet parser/builder
│   ├── AdbKeyStore.java        # RSA key generation & ADB auth
│   └── LocalAdbClient.java     # ADB-over-TCP client (port 5555)
├── data/
│   ├── AppPrefs.java           # SharedPreferences persistence
│   ├── LauncherCandidate.java  # Data model for launcher apps
│   └── LauncherRepository.java # Launcher discovery & state queries
├── launcher/
│   └── LMUHandlerActivity.java # HOME handler / splash screen
├── main/
│   ├── MainActivity.java       # Entry point (Leanback GuidedStep UI)
│   ├── MainGuidedStepFragment.java
│   ├── CustomLauncherOptionsFragment.java
│   ├── StockLauncherPickerFragment.java
│   ├── ConfirmLauncherChangeFragment.java
│   └── SystemOptimizationFragment.java
└── watchdog/
    ├── BootReceiver.java       # Boot-time enforcement
    ├── DebloatManager.java     # 118-package debloat list
    └── WatchdogNeutralizer.java # CVTE watchdog neutralizer
```

**Current Device Fingerprint:**
The APK does NOT currently collect or transmit device fingerprints to any activation server. There is no activation client code in the APK yet. This enhancement plan adds that capability.

### 1.2 Activation Server

**Location:** `E:\launcher-manager-activation-server\`

**Tech Stack:**
- Next.js 16 (App Router, RSC-first)
- TypeScript 5 (strict mode)
- React 19, Tailwind CSS 4, shadcn/Radix UI
- Neon Postgres (serverless)
- Drizzle ORM 0.45
- Argon2id password hashing
- Ed25519 asymmetric license signing (Node `crypto`)
- Zod 4 validation
- Vercel deployment (Singapore region)

**Current Database Schema (9 tables):**

| Table | Purpose |
|---|---|
| `users` | Admin accounts (SUPER_ADMIN / ADMIN roles) |
| `sessions` | HttpOnly session tokens (SHA-256 hashed) |
| `activation_requests` | Device registration requests with fingerprint data |
| `licenses` | Signed license tokens (Ed25519) |
| `license_events` | License lifecycle event log |
| `audit_logs` | Immutable audit trail |
| `security_settings` | Global config (issuer, token validity, etc.) |
| `admin_invocation_locks` | Login rate limiting / account lockout |
| `device_notes` | Admin annotations (no API/UI yet) |

**Current Device Fingerprint Schema:**
```typescript
{
  androidId: string,
  buildFingerprint: string,
  board: string,
  manufacturer: string,
  model: string,
  packageName: string,
  installationId: string,    // <-- PROBLEM: changes on every reinstall
  macAddresses: string[],
  appVersionName?: string,
  appVersionCode?: number,
  customerLabel?: string,
}
```

**Device Hash Calculation:**
```typescript
// fingerprint.ts
function createDeviceHash(payload) {
  const normalized = normalizeFingerprintPayload(payload);
  const canonical = JSON.stringify(normalized);
  return createHash("sha256").update(canonical).digest("hex");
}
```

**Current License Token Structure (v1):**
```json
{
  "ver": 1,
  "licenseId": "uuid",
  "product": "launcher-manager",
  "deviceHash": "sha256hex",
  "packageName": "com.example.app",
  "features": ["activation", "offline-license"],
  "issuedAt": "ISO datetime",
  "notBefore": "ISO datetime",
  "expiresAt": "ISO datetime",
  "issuer": "launcher-manager-activation",
  "signature": "base64url"
}
```

**API Surface (20 endpoints):**

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/device/register` | None | Submit device fingerprint for activation |
| POST | `/api/device/refresh` | None | Refresh expiring license |
| POST | `/api/device/verify` | None | Verify license validity |
| GET | `/api/device/license/:id` | None | Get license record |
| POST | `/api/auth/login` | None | Admin login |
| POST | `/api/auth/logout` | CSRF | Admin logout |
| GET | `/api/auth/session` | None | Get current session |
| POST | `/api/auth/password` | CSRF | Rotate password |
| GET | `/api/admin/activations` | Session | List activation requests |
| POST | `/api/admin/activations/:id/approve` | CSRF + Session | Approve request, issue license |
| POST | `/api/admin/activations/:id/reject` | CSRF + Session | Reject request |
| POST | `/api/admin/licenses/:id/revoke` | CSRF + Session | Revoke license |
| POST | `/api/admin/licenses/:id/reissue` | CSRF + Session | Reissue license |
| GET | `/api/admin/licenses/export` | Session | Export CSV |
| GET | `/api/admin/admins` | Session | List admin accounts |
| POST | `/api/admin/admins` | CSRF + SUPER_ADMIN | Create admin |
| POST | `/api/admin/admins/:id/disable` | CSRF + SUPER_ADMIN | Disable admin |
| POST | `/api/admin/admins/:id/reset-password` | CSRF + SUPER_ADMIN | Reset password |
| GET | `/api/admin/audit` | Session | List audit log |
| GET | `/api/admin/settings` | Session | Get security settings |
| PATCH | `/api/admin/settings` | CSRF + SUPER_ADMIN | Update settings |

**Current Security Mechanisms:**
- Argon2id password hashing (memoryCost: 19,456, timeCost: 3, parallelism: 1)
- HttpOnly session cookies (`lm_admin_session`)
- Session tokens hashed with SHA-256 before storage
- CSRF double-submit cookie pattern with timing-safe comparison
- Per-email+IP login rate limiting (default 5 attempts / 15-minute window)
- RBAC: SUPER_ADMIN / ADMIN roles
- Ed25519 asymmetric license signing
- Multi-factor device fingerprinting
- Transaction safety for approval/revoke/reissue
- Audit logging on all privileged actions
- `import "server-only"` on sensitive modules

---

## 2. Identified Problems & Vulnerabilities

### 2.1 Critical Issues

#### P0-1: `.env.local` Exposed with Real Credentials
- Neon DB URL with password exposed in working directory
- Session secret exposed
- Ed25519 private key exposed
- **Impact:** If repo is pushed or shared, entire system is compromised
- **Fix:** Add to `.gitignore`, rotate all exposed secrets immediately

#### P0-2: Device Identity Breaks on Reinstall
- The `deviceHash` includes `installationId` which changes on every reinstall
- Same physical TV looks like a completely new device after reinstall
- Admin panel has no way to recognize "this TV was activated before"
- **Impact:** Cannot enforce one-license-per-device policy; users can reinstall to get new licenses
- **Fix:** MAC-based device binding (see Section 3)

#### P0-3: No APK Integrity Verification
- APK can be decompiled, modified, and repackaged without detection
- No signature verification at runtime
- No root/debugger/frida detection
- **Impact:** Attacker strips license check, repackages, distributes cracked APK
- **Fix:** APK signature verification + environment checks (see Section 6)

#### P0-4: No Rate Limiting on Device API Endpoints
- `/api/device/register`, `/api/device/refresh`, `/api/device/verify` have zero rate limiting
- **Impact:** Attacker can flood endpoints, brute-force device fingerprints, cause DoS
- **Fix:** Sliding window rate limiting per device + per IP (see Section 7)

### 2.2 High-Priority Issues

#### P1-1: Static 7-Day Sessions with No Rotation
- Admin session cookie valid for 7 days, no rotation
- **Impact:** Stolen session cookie usable for full 7 days
- **Fix:** Session rotation on each request, shorter TTL

#### P1-2: No Certificate Pinning on Client
- APK makes HTTPS requests without pinning server certificate
- **Impact:** MITM attack on hotel network can intercept license tokens
- **Fix:** Certificate pinning in Android app

#### P1-3: License Token Has No Nonce
- Same token can be replayed indefinitely until expiry
- **Impact:** Captured token can be replayed on same device
- **Fix:** Add nonce/counter to token structure

#### P1-4: No Anomaly Detection
- No detection of cloned licenses (same token on multiple devices)
- No detection of MAC spoofing (same MAC with different hardware fingerprints)
- **Impact:** License sharing goes undetected
- **Fix:** Server-side anomaly detection (see Section 7)

#### P1-5: Single Ed25519 Keypair = Single Point of Failure
- If private key leaks, entire licensing system is compromised
- No key rotation mechanism
- **Impact:** Catastrophic if key is exposed
- **Fix:** Key rotation support, multiple trusted public key IDs

### 2.3 Medium-Priority Issues

#### P2-1: No Request Signing on Device Endpoints
- Device requests are not authenticated beyond fingerprint matching
- **Impact:** Anyone can submit fake activation requests
- **Fix:** HMAC request signing with device-specific secret

#### P2-2: No HTTPS Enforcement at Application Level
- Cookie security depends on `APP_BASE_URL` starting with `https://`
- **Impact:** Could accidentally deploy over HTTP
- **Fix:** Application-level HTTPS redirect

#### P2-3: `device_notes` Table Has No API or UI
- Dead code in schema
- **Impact:** Maintenance burden
- **Fix:** Either implement or remove

#### P2-4: Vercel Region Locked to `sin1`
- May have latency implications for other regions
- **Impact:** Slow responses for admins outside Southeast Asia
- **Fix:** Multi-region deployment or edge caching

---

## 3. Proposed Architecture: MAC-Based Device Binding

### 3.1 Core Concept

```
PRIMARY BINDING KEY = SHA-256(primary MAC address)
DEVICE HASH = SHA-256(MAC + androidId + buildFingerprint + model + board)
```

**Rules:**
1. The **primary MAC** (first non-zero, non-multicast MAC from `wlan0`) becomes the device's permanent identity
2. Licenses are bound to `macHash` (device lookup key) AND `deviceHash` (full fingerprint for integrity)
3. On reinstall: same MAC → same `macHash` → server recognizes the device
4. Admin sees: "This device was previously activated on [date]. Status: INACTIVE (app uninstalled). Unbind first to re-activate."

### 3.2 Device Identity Model

```
┌─────────────────────────────────────────────────────────┐
│                    DEVICE IDENTITY                       │
├─────────────────────────────────────────────────────────┤
│  macHash (PRIMARY KEY)                                   │
│    = SHA-256(primary MAC address)                        │
│    → Permanent, survives app reinstall                    │
│    → Changes only if hardware is replaced                 │
│                                                          │
│  deviceHash (INTEGRITY CHECK)                            │
│    = SHA-256(MAC + androidId + buildFingerprint + ...)   │
│    → Detects hardware changes                             │
│    → Changes on firmware update or hardware swap          │
│                                                          │
│  License Token binds to BOTH:                            │
│    - macHash: "this is the same physical device"          │
│    - deviceHash: "the fingerprint matches what we signed" │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Activation Flow (New)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   APK Boots  │────▶│ Collect MAC  │────▶│ Generate     │
│              │     │ + Fingerprint│     │ macHash +    │
└──────────────┘     └──────────────┘     │ deviceHash   │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ POST /api/   │
                                          │ device/      │
                                          │ register     │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │   SERVER: Check        │
                                    │   device_registry by   │
                                    │   macHash              │
                                    └────────┬───────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
          ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
          │ macHash NOT     │     │ macHash FOUND + │     │ macHash FOUND + │
          │ FOUND           │     │ status ACTIVE + │     │ status INACTIVE │
          │ → New device    │     │ has license     │     │ → Previously    │
          │ → Create entry  │     │ → Return license│     │   bound         │
          │ → PENDING       │     │                 │     │ → Return:       │
          │   request       │     │                 │     │   "Unbind first"│
          └─────────────────┘     └─────────────────┘     └─────────────────┘
                    │                        │                        │
                    ▼                        ▼                        ▼
          ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
          │ Admin reviews   │     │ Device operates │     │ Admin must      │
          │ in dashboard,   │     │ normally        │     │ unbind old,     │
          │ approves,       │     │                 │     │ then re-approve │
          │ issues license  │     │                 │     │                 │
          └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 3.4 Device Status Lifecycle

```
                  ┌──────────┐
                  │  NEW     │  (first time seen)
                  └────┬─────┘
                       │
                       ▼
                  ┌──────────┐
            ┌─────│ PENDING  │─────┐
            │     └────┬─────┘     │
            │          │           │
            ▼          │           ▼
      ┌──────────┐     │     ┌──────────┐
      │ REJECTED │     │     │ APPROVED │
      └──────────┘     │     └────┬─────┘
                       │          │
                       │          ▼
                       │     ┌──────────┐
                       │     │  ACTIVE  │◄──────────────┐
                       │     └────┬─────┘               │
                       │          │                     │
                       │          │ App uninstalled     │ Re-activate
                       │          │ or heartbeat lost   │ by admin
                       │          │                     │
                       │          ▼                     │
                       │     ┌──────────┐               │
                       └────►│ INACTIVE │───────────────┘
                             └────┬─────┘
                                  │
                                  │ Admin blocks
                                  │ (fraud, abuse)
                                  ▼
                             ┌──────────┐
                             │  BLOCKED │
                             └──────────┘
```

### 3.5 Reinstall Scenario

```
Scenario: User installs APK → gets activated → uninstalls → reinstalls

Step 1: First install
  - APK reads MAC: AA:BB:CC:DD:EE:FF
  - macHash = SHA-256("AA:BB:CC:DD:EE:FF") = "a3f2b1..."
  - POST /api/device/register { macHash, deviceHash, fingerprint }
  - Server: macHash not found → create device_registry entry → PENDING
  - Admin approves → issues license → status = ACTIVE

Step 2: User uninstalls APK
  - Server: device_registry still exists, status = ACTIVE
  - License still active in database
  - Heartbeat stops (app is gone)

Step 3: User reinstalls APK (same device)
  - APK reads same MAC: AA:BB:CC:DD:EE:FF
  - macHash = "a3f2b1..." (same as before)
  - POST /api/device/register { macHash, deviceHash, fingerprint }
  - Server: macHash FOUND + status ACTIVE
    → Check: does deviceHash match?
    → If YES: return existing license (seamless)
    → If NO (firmware changed): flag for admin review

Step 4: User reinstalls APK (DIFFERENT device, spoofed MAC)
  - macHash matches, but deviceHash is different
  - Server: macHash FOUND + deviceHash MISMATCH
  → Flag anomaly → alert admin → potentially BLOCK
```

---

## 4. Database Schema Changes

### 4.1 New Table: `device_registry`

```sql
CREATE TABLE device_registry (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mac_hash TEXT NOT NULL UNIQUE,              -- SHA-256 of primary MAC
  primary_mac_encrypted TEXT NOT NULL,        -- Encrypted normalized MAC (for admin display)
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_device_hash TEXT,                   -- Latest full fingerprint hash
  current_device_summary JSONB,               -- { manufacturer, model, board, ... }
  activation_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NEW',         -- NEW, PENDING, ACTIVE, INACTIVE, BLOCKED
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_registry_mac_hash ON device_registry(mac_hash);
CREATE INDEX idx_device_registry_status ON device_registry(status);
CREATE INDEX idx_device_registry_last_seen ON device_registry(last_seen_at);
```

### 4.2 Modify `activation_requests`

```sql
ALTER TABLE activation_requests 
  ADD COLUMN mac_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN mac_hash_idx INTEGER;

CREATE INDEX idx_activation_requests_mac_hash ON activation_requests(mac_hash);

-- Backfill: for existing rows, derive mac_hash from fingerprint_payload JSONB
-- (This is a one-time migration; new rows will have mac_hash set at insert time)
```

### 4.3 Modify `licenses`

```sql
ALTER TABLE licenses 
  ADD COLUMN mac_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN nonce TEXT;

CREATE INDEX idx_licenses_mac_hash ON licenses(mac_hash);
```

### 4.4 New Table: `rate_limits`

```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,                     -- SHA-256(identifier)
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);
```

### 4.5 New Table: `anomaly_flags`

```sql
CREATE TABLE anomaly_flags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mac_hash TEXT NOT NULL REFERENCES device_registry(mac_hash),
  device_hash TEXT,
  anomaly_type TEXT NOT NULL,               -- multi_device_hash, cloned_license, rapid_reinstall
  severity TEXT NOT NULL DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
  details JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomaly_flags_mac_hash ON anomaly_flags(mac_hash);
CREATE INDEX idx_anomaly_flags_resolved ON anomaly_flags(resolved);
CREATE INDEX idx_anomaly_flags_created ON anomaly_flags(created_at);
```

### 4.6 Full Updated Schema Diagram

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│    users     │     │  device_registry     │     │   licenses   │
├──────────────┤     ├──────────────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)              │     │ id (PK)      │
│ name         │     │ mac_hash (UNIQUE)    │◄────│ mac_hash     │
│ email        │     │ primary_mac_encrypted│     │ device_hash  │
│ password_hash│     │ first_seen_at        │     │ nonce        │
│ role         │     │ last_seen_at         │     │ token_hash   │
│ status       │     │ current_device_hash  │     │ signed_token │
│ force_pw_reset│    │ current_device_summary│    │ status       │
│ created_at   │     │ activation_count     │     │ features     │
│ updated_at   │     │ status               │     │ issued_at    │
└──────┬───────┘     │ blocked_reason       │     │ not_before   │
       │             │ blocked_at           │     │ expires_at   │
       │             │ blocked_by_user_id   │     │ revoked_at   │
       │             │ last_heartbeat_at    │     │ revoked_by   │
       │             └──────────┬───────────┘     └──────┬───────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   sessions   │     │ activation_requests  │     │license_events│
├──────────────┤     ├──────────────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)              │     │ id (PK)      │
│ user_id (FK) │     │ mac_hash             │     │ license_id   │
│ token_hash   │     │ device_hash          │     │ request_id   │
│ csrf_hash    │     │ status               │     │ actor_user_id│
│ expires_at   │     │ reviewed_by_user_id  │     │ event_type   │
└──────────────┘     └──────────┬───────────┘     │ metadata     │
                                │                 └──────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  anomaly_flags   │
                       ├──────────────────┤
                       │ id (PK)          │
                       │ mac_hash (FK)    │
                       │ device_hash      │
                       │ anomaly_type     │
                       │ severity         │
                       │ details          │
                       │ resolved         │
                       └──────────────────┘
```

---

## 5. API Changes

### 5.1 New Device Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/device/register` | **MODIFIED** — now requires `macHash` |
| POST | `/api/device/refresh` | **MODIFIED** — validates against `macHash` |
| POST | `/api/device/verify` | **MODIFIED** — checks `macHash` binding |
| POST | `/api/device/heartbeat` | **NEW** — periodic heartbeat from active device |

### 5.2 New Admin Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/devices/registry` | Session | List all devices in registry |
| GET | `/api/admin/devices/registry/:macHash` | Session | Get device details + history |
| POST | `/api/admin/devices/registry/:macHash/unbind` | CSRF + Session | Unbind device (set INACTIVE) |
| POST | `/api/admin/devices/registry/:macHash/block` | CSRF + SUPER_ADMIN | Block device |
| POST | `/api/admin/devices/registry/:macHash/reactivate` | CSRF + Session | Re-activate device |
| GET | `/api/admin/anomalies` | Session | List anomaly flags |
| POST | `/api/admin/anomalies/:id/resolve` | CSRF + Session | Resolve anomaly |

### 5.3 Modified Request/Response Schemas

#### POST `/api/device/register` — New Request

```typescript
{
  macHash: string,           // SHA-256 of primary MAC address
  deviceHash: string,        // SHA-256 of full fingerprint
  fingerprint: {
    androidId: string,
    buildFingerprint: string,
    board: string,
    manufacturer: string,
    model: string,
    packageName: string,
    macAddresses: string[],
    appVersionName?: string,
    appVersionCode?: number,
    customerLabel?: string,
  }
}
```

#### POST `/api/device/register` — New Responses

```typescript
// Case 1: New device
{
  status: "PENDING",
  requestId: "uuid",
  message: "Device registered. Awaiting admin approval."
}

// Case 2: Already active
{
  status: "ACTIVE",
  license: { /* signed license token */ },
  message: "Device already activated."
}

// Case 3: Previously bound (inactive)
{
  status: "PREVIOUSLY_BOUND",
  macHash: "a3f2b1...",
  previousActivation: {
    activatedAt: "2026-01-15T00:00:00Z",
    deactivatedAt: "2026-03-20T00:00:00Z",
    reason: "APP_UNINSTALLED"  // or "ADMIN_UNBOUND"
  },
  message: "This device was previously activated. Contact admin to re-activate."
}

// Case 4: Blocked
{
  status: "BLOCKED",
  reason: "License abuse detected",
  blockedAt: "2026-04-01T00:00:00Z",
  message: "This device has been blocked from activation."
}

// Case 5: Anomaly detected
{
  status: "ANOMALY_DETECTED",
  anomalyType: "DEVICE_HASH_MISMATCH",
  message: "Device fingerprint changed. Awaiting admin review."
}
```

#### POST `/api/device/heartbeat` — New Endpoint

```typescript
// Request
{
  macHash: string,
  deviceHash: string,
  license: { /* current signed license token */ },
  timestamp: number,  // Unix ms
}

// Response
{
  status: "OK" | "EXPIRED" | "REVOKED" | "MISMATCH",
  nextHeartbeatIn: 3600000,  // ms until next heartbeat
}
```

### 5.4 New License Token Structure (v2)

```json
{
  "ver": 2,
  "licenseId": "uuid",
  "product": "launcher-manager",
  "macHash": "sha256-of-primary-mac",
  "deviceHash": "sha256-of-full-fingerprint",
  "packageName": "com.example.app",
  "features": ["activation", "offline-license"],
  "issuedAt": "2026-04-14T00:00:00Z",
  "notBefore": "2026-04-14T00:00:00Z",
  "expiresAt": "2027-04-14T00:00:00Z",
  "issuer": "launcher-manager-activation",
  "nonce": "random-32-bytes-base64url",
  "hmacSecret": "encrypted-device-secret-for-request-signing",
  "signature": "base64url"
}
```

---

## 6. APK Security Hardening

### 6.1 ProGuard/R8 Obfuscation

**build.gradle changes:**
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

**proguard-rules.pro:**
```proguard
# === Keep Android entry points ===
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# === Keep ADB protocol classes (use reflection) ===
-keep class com.wolf.google.lm.adb.** { *; }

# === Keep data models (used by JSON serialization) ===
-keep class com.wolf.google.lm.data.** { *; }

# === Aggressively obfuscate security classes ===
-keepclassmembers class com.wolf.google.lm.security.** {
    private <fields>;
    private <methods>;
}

# === Remove all logging in release ===
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
}

# === Obfuscate string constants ===
-adaptclassstrings

# === Remove unused code ===
-printusage

# === Optimize ===
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
```

### 6.2 APK Signature Verification

**New file:** `app/src/main/java/com/wolf/google/lm/security/AppIntegrity.java`

```java
package com.wolf.google.lm.security;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class AppIntegrity {

    // Release signing cert SHA-256 fingerprint
    // Generate with: keytool -list -v -keystore release.keystore -alias youralias
    private static final String[] EXPECTED_CERT_HASHES = {
        "YOUR_RELEASE_CERT_SHA256_HERE"
    };

    public static boolean verifyAppSignature(Context context) {
        try {
            PackageInfo info;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info = context.getPackageManager().getPackageInfo(
                    context.getPackageName(),
                    PackageManager.GET_SIGNING_CERTIFICATES
                );
                for (Signature sig : info.signingInfo.getApkContentsSigners()) {
                    String hash = getCertHash(sig, "SHA-256");
                    for (String expected : EXPECTED_CERT_HASHES) {
                        if (expected.equals(hash)) return true;
                    }
                }
            } else {
                info = context.getPackageManager().getPackageInfo(
                    context.getPackageName(),
                    PackageManager.GET_SIGNATURES
                );
                for (Signature sig : info.signatures) {
                    String hash = getCertHash(sig, "SHA-256");
                    for (String expected : EXPECTED_CERT_HASHES) {
                        if (expected.equals(hash)) return true;
                    }
                }
            }
        } catch (Exception e) {
            return false;
        }
        return false;
    }

    private static String getCertHash(Signature cert, String algorithm) {
        try {
            MessageDigest md = MessageDigest.getInstance(algorithm);
            byte[] hash = md.digest(cert.toByteArray());
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    public static boolean isDebuggable(Context context) {
        return (context.getApplicationInfo().flags &
                android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    public static boolean isRunningOnEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK")
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu")
            || Build.BOARD.toLowerCase().contains("nox")
            || Build.BOOTLOADER.toLowerCase().contains("nox");
    }
}
```

### 6.3 Root / Debugger / Frida Detection

**New file:** `app/src/main/java/com/wolf/google/lm/security/EnvironmentCheck.java`

```java
package com.wolf.google.lm.security;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Debug;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

public class EnvironmentCheck {

    private static final String[] ROOT_BINARIES = {
        "/system/bin/su", "/system/xbin/su", "/system/app/Superuser.apk",
        "/sbin/su", "/vendor/bin/su", "/data/local/xbin/su",
        "/data/local/bin/su", "/system/sd/xbin/su"
    };

    private static final String[] DANGEROUS_PACKAGES = {
        "eu.chainfire.supersu", "com.noshufou.android.su",
        "com.thirdparty.superuser", "com.topjohnwu.magisk",
        "org.frida.frida", "com.saurik.substrate"
    };

    private static final String[] FRIDA_FILES = {
        "/data/local/tmp/frida-server",
        "/data/local/tmp/re.frida.server",
        "/data/local/tmp/gadget"
    };

    public static boolean isRooted() {
        for (String path : ROOT_BINARIES) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    public static boolean isDebuggerAttached() {
        return Debug.isDebuggerConnected() || Debug.waitingForDebugger();
    }

    public static boolean hasFrida() {
        for (String path : FRIDA_FILES) {
            if (new File(path).exists()) return true;
        }
        try (BufferedReader reader = new BufferedReader(
                new FileReader("/proc/self/status"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.toLowerCase().contains("frida") ||
                    line.toLowerCase().contains("xposed")) {
                    return true;
                }
            }
        } catch (IOException e) {}
        return false;
    }

    public static boolean hasDangerousPackages(Context ctx) {
        PackageManager pm = ctx.getPackageManager();
        for (String pkg : DANGEROUS_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {}
        }
        return false;
    }

    public static boolean isSecure(Context ctx) {
        return !isRooted()
            && !isDebuggerAttached()
            && !hasFrida()
            && !hasDangerousPackages(ctx)
            && !isDebuggable(ctx)
            && !isRunningOnEmulator();
    }
}
```

### 6.4 Self-Destruct / Kill Switch

**New file:** `app/src/main/java/com/wolf/google/lm/security/LicenseGuard.java`

```java
package com.wolf.google.lm.security;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import com.wolf.google.lm.data.AppPrefs;

public class LicenseGuard {

    private static final int MAX_OFFLINE_DAYS = 7;
    private static final int HEARTBEAT_INTERVAL_MS = 3600000; // 1 hour

    public enum LicenseStatus {
        VALID,
        EXPIRED,
        REVOKED,
        TAMPERED,
        OFFLINE_TOO_LONG,
        DEVICE_MISMATCH
    }

    public static LicenseStatus checkLicense(Context context) {
        // 1. Verify app signature (not repackaged)
        if (!AppIntegrity.verifyAppSignature(context)) {
            triggerSelfDestruct(context);
            return LicenseStatus.TAMPERED;
        }

        // 2. Check environment (no root/debugger/frida)
        if (!EnvironmentCheck.isSecure(context)) {
            triggerSelfDestruct(context);
            return LicenseStatus.TAMPERED;
        }

        // 3. Verify license token exists
        AppPrefs prefs = new AppPrefs(context);
        String licenseToken = prefs.getLicenseToken();
        if (licenseToken == null || licenseToken.isEmpty()) {
            return LicenseStatus.EXPIRED;
        }

        // 4. Check offline duration
        long lastVerified = prefs.getLastServerVerification();
        long now = System.currentTimeMillis();
        if (now - lastVerified > MAX_OFFLINE_DAYS * 24 * 3600000L) {
            return LicenseStatus.OFFLINE_TOO_LONG;
        }

        return LicenseStatus.VALID;
    }

    public static void triggerSelfDestruct(Context context) {
        // Wipe all activation data
        AppPrefs prefs = new AppPrefs(context);
        prefs.clearLicense();
        prefs.clearDeviceRegistration();

        // Re-enable stock launcher (undo all changes)
        try {
            Runtime.getRuntime().exec(new String[]{
                "pm", "enable", "com.cvte.tv.launcher"
            });
        } catch (Exception e) {}

        // Force crash on next launch
        SharedPreferences crashPrefs = context.getSharedPreferences(
            "crash_flag", Context.MODE_PRIVATE);
        crashPrefs.edit().putBoolean("self_destructed", true).apply();
    }

    public static void startHeartbeat(Context context) {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                LicenseStatus status = checkLicense(context);
                if (status != LicenseStatus.VALID) {
                    triggerSelfDestruct(context);
                    return;
                }
                // Send heartbeat to server
                // POST /api/device/heartbeat with current license
                // If server says REVOKED → triggerSelfDestruct
                handler.postDelayed(this, HEARTBEAT_INTERVAL_MS);
            }
        }, HEARTBEAT_INTERVAL_MS);
    }
}
```

### 6.5 Obfuscated Constants (String Encryption)

**New file:** `app/src/main/java/com/wolf/google/lm/security/ObfuscatedString.java`

```java
package com.wolf.google.lm.security;

public class ObfuscatedString {

    // XOR-encoded strings for critical values
    // Server URL, public key, ADB commands, etc.
    // Generate at build time or manually

    private static final byte[] SERVER_URL_KEY = {0x42, 0x17, (byte)0x93, 0x28};
    private static final byte[] SERVER_URL_DATA = {
        // XOR-encoded "https://your-server.vercel.app"
    };

    private static final byte[] PUBLIC_KEY_KEY = {0x7A, 0x3C, 0x1F, (byte)0xE4};
    private static final byte[] PUBLIC_KEY_DATA = {
        // XOR-encoded Ed25519 public key PEM
    };

    public static String getServerUrl() {
        return xorDecode(SERVER_URL_DATA, SERVER_URL_KEY);
    }

    public static String getPublicKey() {
        return xorDecode(PUBLIC_KEY_DATA, PUBLIC_KEY_KEY);
    }

    private static String xorDecode(byte[] data, byte[] key) {
        byte[] result = new byte[data.length];
        for (int i = 0; i < data.length; i++) {
            result[i] = (byte) (data[i] ^ key[i % key.length]);
        }
        return new String(result);
    }
}
```

### 6.6 Certificate Pinning

**Implementation approach:**
- Use OkHttp's `CertificatePinner` for all server communication
- Pin the server's TLS certificate public key
- Fallback: use Android's `NetworkSecurityConfig` with `<pin-set>`

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">your-server.vercel.app</domain>
        <pin-set>
            <pin digest="SHA-256">base64-encoded-spki-hash</pin>
            <pin digest="SHA-256">backup-pin-hash</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

---

## 7. Server Security Hardening

### 7.1 Rate Limiting on Device Endpoints

**New file:** `src/lib/rate-limit.ts`

```typescript
import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const DEVICE_RATE_LIMITS = {
  perDevice: { windowMs: 60_000, maxRequests: 10 },     // 10 req/min per device
  perIp: { windowMs: 60_000, maxRequests: 30 },          // 30 req/min per IP
  register: { windowMs: 300_000, maxRequests: 3 },       // 3 registrations per 5 min
  heartbeat: { windowMs: 60_000, maxRequests: 2 },       // 2 heartbeats per min
} as const;

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const key = createHash("sha256").update(identifier).digest("hex");
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  const [record] = await db
    .select()
    .from(rateLimits)
    .where(sql`${rateLimits.key} = ${key}`);

  if (!record || record.windowStart < windowStart) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, windowStart: now },
      });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (record.count >= config.maxRequests) {
    const retryAfter = record.windowStart.getTime() + config.windowMs - now.getTime();
    return { allowed: false, remaining: 0, retryAfter };
  }

  await db
    .update(rateLimits)
    .set({ count: record.count + 1 })
    .where(sql`${rateLimits.key} = ${key}`);

  return { allowed: true, remaining: config.maxRequests - record.count - 1 };
}

// Cleanup old rate limit records (run periodically)
export async function cleanupRateLimits() {
  const cutoff = new Date(Date.now() - 3600_000); // 1 hour ago
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < ${cutoff}`);
}
```

**Usage in device routes:**
```typescript
// In /api/device/register/route.ts
import { checkRateLimit, DEVICE_RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const body = await request.json();
  const macHash = body.macHash;

  // Check per-device rate limit
  const deviceLimit = await checkRateLimit(`device:${macHash}`, DEVICE_RATE_LIMITS.perDevice);
  if (!deviceLimit.allowed) {
    return jsonError(429, "Too many requests from this device", {
      retryAfter: deviceLimit.retryAfter,
    });
  }

  // Check per-IP rate limit
  const ipLimit = await checkRateLimit(`ip:${ip}`, DEVICE_RATE_LIMITS.perIp);
  if (!ipLimit.allowed) {
    return jsonError(429, "Too many requests from this IP", {
      retryAfter: ipLimit.retryAfter,
    });
  }

  // ... rest of handler
}
```

### 7.2 Request Signing (HMAC)

**Concept:** After first activation, the license token includes an `hmacSecret`. The device uses this secret to sign every subsequent request.

**Server-side verification:**
```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyRequestSignature(
  body: string,
  timestamp: number,
  signature: string,
  hmacSecret: string
): boolean {
  // Reject requests older than 5 minutes
  if (Date.now() - timestamp > 300_000) {
    return false;
  }

  const expectedSignature = createHmac("sha256", hmacSecret)
    .update(`${body}:${timestamp}`)
    .digest("base64url");

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

**Client-side signing (Android):**
```java
public String signRequest(String body, String hmacSecret) {
    long timestamp = System.currentTimeMillis();
    String message = body + ":" + timestamp;

    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(Base64.decode(hmacSecret, Base64.URL_SAFE), "HmacSHA256"));
    byte[] signature = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));

    return Base64.encodeToString(signature, Base64.URL_SAFE);
}
```

### 7.3 Anomaly Detection

**New file:** `src/lib/anomaly-detection.ts`

```typescript
import { db } from "@/lib/db/client";
import { eq, sql, count } from "drizzle-orm";
import { licenses, anomalyFlags, deviceRegistry } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/audit";

export async function detectAnomalies(macHash: string, deviceHash: string) {
  const anomalies: Array<{ type: string; severity: string; details: Record<string, unknown> }> = [];

  // Check 1: Same macHash with multiple different deviceHashes
  // (could indicate MAC spoofing or hardware swap)
  const distinctDeviceHashes = await db
    .select({ deviceHash: licenses.deviceHash })
    .from(licenses)
    .where(eq(licenses.macHash, macHash))
    .groupBy(licenses.deviceHash);

  if (distinctDeviceHashes.length > 3) {
    anomalies.push({
      type: "multi_device_hash",
      severity: "HIGH",
      details: {
        distinctCount: distinctDeviceHashes.length,
        deviceHashes: distinctDeviceHashes.map(d => d.deviceHash),
      },
    });
  }

  // Check 2: Same deviceHash appearing with different macHashes
  // (could indicate license cloning)
  const distinctMacHashes = await db
    .select({ macHash: licenses.macHash })
    .from(licenses)
    .where(eq(licenses.deviceHash, deviceHash))
    .groupBy(licenses.macHash);

  if (distinctMacHashes.length > 1) {
    anomalies.push({
      type: "cloned_license",
      severity: "CRITICAL",
      details: {
        macCount: distinctMacHashes.length,
        macHashes: distinctMacHashes.map(m => m.macHash),
      },
    });
  }

  // Check 3: Rapid reinstall detection
  // (same macHash with multiple activation_requests in short time)
  const recentRequests = await db
    .select({ count: count() })
    .from(activationRequests)
    .where(
      and(
        eq(activationRequests.macHash, macHash),
        sql`${activationRequests.created_at} > NOW() - INTERVAL '24 hours'`
      )
    );

  if (recentRequests[0]?.count > 5) {
    anomalies.push({
      type: "rapid_reinstall",
      severity: "MEDIUM",
      details: { requestCount: recentRequests[0].count },
    });
  }

  // Check 4: Device hash changed since last known
  const [device] = await db
    .select()
    .from(deviceRegistry)
    .where(eq(deviceRegistry.macHash, macHash));

  if (device && device.currentDeviceHash && device.currentDeviceHash !== deviceHash) {
    anomalies.push({
      type: "device_hash_changed",
      severity: "MEDIUM",
      details: {
        previousHash: device.currentDeviceHash,
        newHash: deviceHash,
      },
    });
  }

  // Record anomalies
  for (const anomaly of anomalies) {
    await db.insert(anomalyFlags).values({
      macHash,
      deviceHash,
      anomalyType: anomaly.type,
      severity: anomaly.severity,
      details: anomaly.details,
    });

    await writeAuditLog({
      action: `anomaly.${anomaly.type}`,
      targetType: "device",
      targetId: macHash,
      metadata: { severity: anomaly.severity, details: anomaly.details },
    });
  }

  return {
    flagged: anomalies.length > 0,
    anomalies,
  };
}
```

### 7.4 Session Hardening

**Changes to session management:**
- Rotate session token on each request (prevent fixation)
- Add `User-Agent` binding to session
- Add IP change detection (flag if session jumps IPs)
- Reduce default TTL from 7 days to 24 hours with sliding window

```typescript
// In session.ts
export async function rotateSession() {
  const currentSession = await getCurrentSession();
  if (!currentSession) return;

  // Destroy old session
  await destroySession();

  // Create new session with same user
  await createSession(currentSession.userId);
}

export async function validateSessionIntegrity(request: Request) {
  const session = await getCurrentSession();
  if (!session) return false;

  const userAgent = request.headers.get("user-agent") ?? "";
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  // Check if User-Agent matches session's recorded UA
  if (session.userAgent && session.userAgent !== userAgent) {
    await destroySession();
    await writeAuditLog({
      action: "session.ua_mismatch",
      targetType: "session",
      targetId: session.id,
      metadata: { expectedUA: session.userAgent, actualUA: userAgent },
    });
    return false;
  }

  // Check if IP changed significantly (different subnet)
  if (session.ip && !ipInSameSubnet(session.ip, ip)) {
    await writeAuditLog({
      action: "session.ip_change",
      targetType: "session",
      targetId: session.id,
      metadata: { expectedIP: session.ip, actualIP: ip },
    });
    // Don't destroy, but flag for review
  }

  return true;
}
```

### 7.5 Key Rotation Support

**New fields in `security_settings`:**
```sql
ALTER TABLE security_settings
  ADD COLUMN public_key_id_v2 TEXT,
  ADD COLUMN key_rotation_at TIMESTAMP WITH TIME ZONE;
```

**License token changes:**
```json
{
  "publicKeyId": "key-2026-04",
  // ... rest of token
}
```

**Verification logic:**
```typescript
const PUBLIC_KEYS: Record<string, string> = {
  "key-2026-04": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "key-2025-01": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----", // retired but still valid for old tokens
};

export function verifySignedLicense(license: SignedLicenseToken): boolean {
  const publicKey = PUBLIC_KEYS[license.publicKeyId];
  if (!publicKey) return false;

  // ... verify signature with correct public key
}
```

---

## 8. Admin Dashboard Enhancements

### 8.1 New Page: Device Registry

**Route:** `/devices/registry`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Device Registry                                    [+ Export CSV]  │
├─────────────────────────────────────────────────────────────────────┤
│  Search: [________________]  Status: [All ▼]  Sort: [Last Seen ▼]  │
├──────┬──────────┬──────────────┬──────────┬─────────┬──────────────┤
│ MAC  │ Device   │ Status       │ Activ.  │ First   │ Last Seen    │
│ Hash │          │              │ Count   │ Seen    │              │
├──────┼──────────┼──────────────┼──────────┼─────────┼──────────────┤
│ a3f2 │ CVTE     │ ● ACTIVE     │ 1       │ Jan 15  │ 2 min ago    │
│ b1c4 │ HiSilicon│ ● INACTIVE   │ 2       │ Dec 01  │ 30 days ago  │
│ d7e9 │ CVTE     │ ● BLOCKED    │ 5       │ Nov 20  │ 1 day ago    │
│      │          │   [Unbind]   │         │         │   [Unblock]  │
└──────┴──────────┴──────────────┴──────────┴─────────┴──────────────┘
```

**Device Detail Modal:**
```
┌─────────────────────────────────────────────────────────┐
│  Device: a3f2b1...                          [Close]     │
├─────────────────────────────────────────────────────────┤
│  Primary MAC Hash: a3f2b1c4d7e9f0a2b3c4d5e6f7a8b9c0     │
│  Manufacturer: CVTE                                      │
│  Model: HiSilicon AN14                                   │
│  Board: mars                                             │
│  Package: com.cvte.tv.launcher                           │
│                                                         │
│  Status: ● ACTIVE                                        │
│  Activation Count: 1                                     │
│  First Seen: 2026-01-15 00:00:00 UTC                     │
│  Last Seen: 2026-04-14 12:30:00 UTC                      │
│  Last Heartbeat: 2026-04-14 12:00:00 UTC                 │
│                                                         │
│  ┌─ License History ──────────────────────────────────┐ │
│  │ 2026-01-15  ISSUED    by admin@example.com         │ │
│  │ 2026-03-20  REFRESHED (auto)                       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Anomaly Flags ────────────────────────────────────┐ │
│  │ (none)                                              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [Unbind Device]  [Block Device]  [Reissue License]     │
└─────────────────────────────────────────────────────────┘
```

### 8.2 New Page: Anomaly Dashboard

**Route:** `/anomalies`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Anomaly Flags                                      [Filter ▼]      │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 CRITICAL (1)  🟠 HIGH (3)  🟡 MEDIUM (7)  🟢 LOW (12)          │
├──────┬─────────────┬──────────┬──────────┬─────────────┬───────────┤
│ Sev. │ Type        │ MAC Hash │ Device   │ Created     │ Actions   │
├──────┼─────────────┼──────────┼──────────┼─────────────┼───────────┤
│ 🔴   │ cloned_     │ a3f2...  │ CVTE     │ 2 min ago   │ [Resolve] │
│      │ license     │          │          │             │ [Block]   │
├──────┼─────────────┼──────────┼──────────┼─────────────┼───────────┤
│ 🟠   │ multi_dev   │ b1c4...  │ HiSilicon│ 1 hour ago  │ [Resolve] │
│      │ ice_hash    │          │          │             │ [Review]  │
└──────┴─────────────┴──────────┴──────────┴─────────────┴───────────┘
```

### 8.3 Enhanced Activation Request View

When admin views a pending activation request, they now see:

```
┌─────────────────────────────────────────────────────────┐
│  Activation Request: req-abc123                         │
├─────────────────────────────────────────────────────────┤
│  MAC Hash: a3f2b1c4d7e9f0a2b3c4d5e6f7a8b9c0             │
│  Device: CVTE HiSilicon AN14 (board: mars)              │
│  Package: com.cvte.tv.launcher                          │
│  App Version: 1.0.4 (104)                               │
│  Submitted: 2026-04-14 12:00:00 UTC                     │
│  IP: 192.168.1.100                                      │
│                                                         │
│  ⚠️ This device was previously activated:               │
│    - Activated: 2026-01-15 by admin@example.com         │
│    - Unbound: 2026-04-10 by admin@example.com           │
│    - Reason: Admin unbound for reinstallation            │
│                                                         │
│  [Approve]  [Reject]                                    │
│  Note: [________________________________]               │
│  Features: [x] activation  [x] offline-license           │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Priority & Timeline

### Phase 0: Emergency Fixes (Day 1)

| Task | Effort | Risk if Not Done |
|---|---|---|
| Remove `.env.local` from repo / rotate all secrets | 30 min | CRITICAL — credentials exposed |
| Add `.env.local` to `.gitignore` | 5 min | CRITICAL — credentials exposed |
| Verify Neon DB access is restricted | 15 min | HIGH — database accessible |

### Phase 1: MAC-Based Device Binding (Days 2-5)

| Task | Effort | Dependencies |
|---|---|---|
| Create `device_registry` table migration | 2 hours | Phase 0 |
| Add `mac_hash` columns to `activation_requests` and `licenses` | 1 hour | Above |
| Update `createDeviceHash` to use MAC as primary key | 2 hours | Above |
| Update `submitActivationRequest` with device_registry logic | 4 hours | Above |
| Update `refreshLicense` and `verifyDeviceLicense` for macHash | 2 hours | Above |
| Update Zod schemas for new request/response formats | 2 hours | Above |
| Create `anomaly_flags` table | 1 hour | Above |
| Write anomaly detection logic | 4 hours | Above |
| Test full activation flow with MAC binding | 4 hours | All above |

**Total Phase 1: ~22 hours (3-4 days)**

### Phase 2: APK Security Hardening (Days 6-9)

| Task | Effort | Dependencies |
|---|---|---|
| Add MAC address collection to APK | 4 hours | — |
| Add activation client code (HTTP to server) | 8 hours | — |
| Implement `AppIntegrity.java` (signature verification) | 3 hours | — |
| Implement `EnvironmentCheck.java` (root/debugger/frida) | 3 hours | — |
| Implement `LicenseGuard.java` (self-destruct/heartbeat) | 4 hours | Above |
| Implement `ObfuscatedString.java` (string encryption) | 2 hours | — |
| Configure ProGuard/R8 rules | 2 hours | — |
| Add certificate pinning | 2 hours | — |
| Test on actual CVTE device | 4 hours | All above |

**Total Phase 2: ~32 hours (4 days)**

### Phase 3: Server Hardening (Days 10-12)

| Task | Effort | Dependencies |
|---|---|---|
| Implement rate limiting middleware | 4 hours | Phase 1 |
| Add HMAC request signing | 4 hours | Phase 1 |
| Harden session management (rotation, UA binding) | 3 hours | — |
| Add key rotation support | 3 hours | — |
| Add HTTPS enforcement | 1 hour | — |
| Load test device endpoints | 2 hours | All above |

**Total Phase 3: ~17 hours (2-3 days)**

### Phase 4: Admin Dashboard (Days 13-16)

| Task | Effort | Dependencies |
|---|---|---|
| Device Registry page (list + detail) | 8 hours | Phase 1 |
| Unbind / Block / Re-activate actions | 4 hours | Above |
| Anomaly Dashboard page | 4 hours | Phase 1 |
| Enhanced activation request view | 3 hours | Phase 1 |
| CSV export for device registry | 2 hours | Phase 1 |
| E2E testing of admin flows | 4 hours | All above |

**Total Phase 4: ~25 hours (3-4 days)**

### Phase 5: Polish & Hardening (Days 17-19)

| Task | Effort | Dependencies |
|---|---|---|
| Security audit / penetration testing | 8 hours | All phases |
| Fix identified issues | 4 hours | Above |
| Documentation | 4 hours | All phases |
| Deployment preparation | 2 hours | All phases |

**Total Phase 5: ~18 hours (2-3 days)**

### Summary

| Phase | Duration | Total Hours |
|---|---|---|
| Phase 0: Emergency | 0.5 day | 1 |
| Phase 1: MAC Binding | 3-4 days | 22 |
| Phase 2: APK Security | 4 days | 32 |
| Phase 3: Server Hardening | 2-3 days | 17 |
| Phase 4: Admin Dashboard | 3-4 days | 25 |
| Phase 5: Polish | 2-3 days | 18 |
| **Total** | **~15-17 days** | **~115 hours** |

---

## 10. Risk Assessment

### 10.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| APK decompiled & repackaged | HIGH | CRITICAL | Signature verification, ProGuard, self-destruct |
| License token extracted & replayed | MEDIUM | HIGH | Nonce, device binding, HMAC signing |
| MAC address spoofed | LOW | HIGH | Multi-factor fingerprint, anomaly detection |
| Server credentials leaked | MEDIUM | CRITICAL | `.env.local` fix, key rotation, KMS |
| MITM attack on hotel network | MEDIUM | HIGH | Certificate pinning, HTTPS enforcement |
| Brute-force activation requests | HIGH | MEDIUM | Rate limiting, CAPTCHA for admin |
| Admin account compromised | LOW | CRITICAL | MFA (future), session hardening, audit logs |
| Database breach | LOW | CRITICAL | Encrypted columns, network isolation, backups |

### 10.2 Residual Risks (Acceptable)

| Risk | Why Acceptable |
|---|---|
| Determined reverse engineer with physical access | Economic deterrence: make it take weeks, not hours |
| Zero-day vulnerability in Android | Out of scope; monitor security advisories |
| Social engineering of admin | Training + audit log monitoring |
| Hardware-level MAC spoofing | Extremely rare on TV hardware; anomaly detection catches it |

### 10.3 Security Philosophy

> **No system is truly "impenetrable."** The goal is **economic deterrence** — make the cost of attack exceed the value of the bypass.

With the enhancements in this document:
- **Casual attacker** (script kiddie): Blocked by ProGuard + signature verification
- **Moderate attacker** (experienced dev): Blocked by root detection + self-destruct + MAC binding
- **Determined attacker** (skilled reverse engineer): Slowed to weeks of work by layered defenses
- **State-level attacker**: Out of scope; would require hardware security module and custom silicon

### 10.4 Key Metrics to Monitor

| Metric | Threshold | Action |
|---|---|---|
| Failed activation attempts per device | > 5/hour | Auto-block device |
| License verification failures | > 10/device/day | Flag for review |
| Anomaly flags (unresolved) | > 20 | Alert admin team |
| API response time (p95) | > 2s | Investigate performance |
| Heartbeat miss rate | > 5% of devices | Check server health |
| Admin login failures | > 10/email/hour | Lock account |

---

## Appendix A: MAC Address Collection (Android)

```java
public class MacAddressCollector {

    public static String getPrimaryMacAddress() {
        // Method 1: NetworkInterface (requires ACCESS_WIFI_STATE or NETWORK_STATE)
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                // Prefer wlan0 (Wi-Fi), then eth0 (Ethernet)
                if ("wlan0".equals(iface.getName()) || "eth0".equals(iface.getName())) {
                    byte[] mac = iface.getHardwareAddress();
                    if (mac != null && mac.length == 6 && !isZeroMac(mac) && !isMulticastMac(mac)) {
                        return formatMac(mac);
                    }
                }
            }
        } catch (Exception e) {}

        // Method 2: Read from sysfs (works on rooted or engineering builds)
        try {
            String mac = readFile("/sys/class/net/wlan0/address");
            if (mac != null && isValidMac(mac)) return mac.trim().toLowerCase();
        } catch (Exception e) {}

        // Method 3: Use WifiManager (deprecated in API 29+, but works on older)
        try {
            WifiManager wm = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
            WifiInfo info = wm.getConnectionInfo();
            String mac = info.getMacAddress();
            if (mac != null && !mac.equals("02:00:00:00:00:00")) return mac.toLowerCase();
        } catch (Exception e) {}

        return null;
    }

    public static String computeMacHash(String macAddress) {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(macAddress.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    private static boolean isZeroMac(byte[] mac) {
        for (byte b : mac) if (b != 0) return false;
        return true;
    }

    private static boolean isMulticastMac(byte[] mac) {
        return (mac[0] & 0x01) == 0x01;
    }

    private static String formatMac(byte[] mac) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < mac.length; i++) {
            sb.append(String.format("%02x", mac[i]));
            if (i < mac.length - 1) sb.append(":");
        }
        return sb.toString();
    }

    private static String readFile(String path) throws IOException {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
```

---

## Appendix B: Encryption at Rest for MAC Addresses

For compliance and privacy, store MAC addresses encrypted in the database:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.MAC_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encryptMac(mac: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(mac, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptMac(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

---

## Appendix C: Checklist for Discussion with Other AI Models

- [ ] Is MAC-based binding the right approach, or should we use Android ID + Serial as primary?
- [ ] Should `device_registry` status include a `SUSPECTED_FRAUD` state?
- [ ] Is HMAC request signing worth the complexity, or is Ed25519 + deviceHash sufficient?
- [ ] Should we implement certificate pinning at the TLS layer or application layer?
- [ ] Is the self-destruct mechanism too aggressive? Should it have a grace period?
- [ ] Should anomaly detection auto-block or only flag for review?
- [ ] Is ProGuard sufficient, or should we use commercial obfuscation (DexGuard, Allatori)?
- [ ] Should we implement a challenge-response mechanism for license verification?
- [ ] Is the 7-day offline grace period appropriate for hotel TV deployments?
- [ ] Should we add hardware attestation (SafetyNet / Play Integrity API)?
- [ ] Should the admin dashboard support bulk operations (bulk unbind, bulk block)?
- [ ] Is the rate limiting approach (DB-based) scalable, or should we use Redis?
- [ ] Should we implement a webhook system for real-time anomaly alerts?
- [ ] Is the nonce in the license token sufficient for replay protection?
- [ ] Should we add a "device fingerprint change" approval workflow?

---

*Document generated by senior architect analysis of CBT Launcher Manager APK + Activation Server. Review with security team before implementation.*
