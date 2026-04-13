# Launcher Manager Activation Server

Standalone Next.js activation control server for Launcher Manager. This app is designed for Vercel + Neon and avoids the fragile patterns from the earlier hotfix panel:

- no custom Express wrapper
- no split frontend/backend boot process
- no filesystem persistence in production
- no ad hoc raw `pg` query layer as the primary backend

## What it does

- email/password admin login with secure cookie sessions
- role-based access control with `SUPER_ADMIN` and `ADMIN`
- first super admin bootstrapped from environment variables
- device activation requests stored in Neon via Drizzle ORM
- Ed25519-signed offline license tokens for Launcher Manager
- admin approval, rejection, reissue, and revoke flows
- audit logging for privileged actions
- dark-mode operator console with a clean dashboard UI

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS + local shadcn-style components
- Neon Postgres
- Drizzle ORM + Drizzle Kit
- `@node-rs/argon2` for password hashing
- `jose` + Node crypto for signed license handling

## Roles

### SUPER_ADMIN

- create admin accounts
- disable admins
- reset admin passwords
- manage security settings
- approve and revoke activations
- view all audit history

### ADMIN

- approve activation requests
- revoke/reissue licenses
- review device inventory
- review audit history

## Device activation flow

1. Launcher Manager sends a normalized device fingerprint to `POST /api/device/register`
2. Server creates a `PENDING` activation request
3. Admin or super admin approves the request
4. Server issues a signed offline license token
5. Launcher Manager stores the token locally
6. Launcher Manager verifies the token offline using the embedded public key

The app is designed so activation failure blocks new protected actions rather than breaking an already working TV state.

## Environment variables

Copy `.env.example` and configure:

- `APP_BASE_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ACTIVATION_PRIVATE_KEY`
- `ACTIVATION_PUBLIC_KEY_ID`
- `FIRST_SUPER_ADMIN_NAME`
- `FIRST_SUPER_ADMIN_EMAIL`
- `FIRST_SUPER_ADMIN_PASSWORD`
- `DEFAULT_ISSUER`
- `TOKEN_VALIDITY_DAYS`
- `TOKEN_RENEWAL_DAYS`
- `LOGIN_RATE_LIMIT_WINDOW_MINUTES`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`

## Local setup

```bash
pnpm install
pnpm db:generate
pnpm lint
pnpm build
pnpm dev
```

## Database and migrations

Drizzle schema lives in:

- `src/lib/db/schema.ts`

Generated SQL migrations live in:

- `drizzle/`

Initial migration is already included so the repo is ready to push and apply in a fresh Neon database.

## API surface

### Device routes

- `POST /api/device/register`
- `POST /api/device/refresh`
- `POST /api/device/verify`
- `GET /api/device/license/:id`

### Admin routes

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/password`
- `GET /api/admin/activations`
- `POST /api/admin/activations/:requestId/approve`
- `POST /api/admin/activations/:requestId/reject`
- `POST /api/admin/licenses/:licenseId/revoke`
- `POST /api/admin/licenses/:licenseId/reissue`
- `GET /api/admin/licenses/export`
- `GET /api/admin/admins`
- `POST /api/admin/admins`
- `POST /api/admin/admins/:userId/disable`
- `POST /api/admin/admins/:userId/reset-password`
- `GET /api/admin/audit`
- `GET/PATCH /api/admin/settings`

## Deployment notes

- deploy this app directly to Vercel
- connect Neon as the Postgres backend
- set production environment variables in Vercel
- keep the Ed25519 private key only in Vercel env vars
- embed only the public verification key in Launcher Manager
- keep production branch protection on the repo

## Security notes

- sessions are HttpOnly cookies
- state-changing admin routes require CSRF validation
- logins are rate-limited and locked after repeated failures
- disabled admins lose all active sessions immediately
- new admins are forced to rotate their temporary password
- the private signing key never leaves the server
