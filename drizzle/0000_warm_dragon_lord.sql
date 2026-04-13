CREATE TYPE "public"."activation_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'DISABLED', 'PENDING_RESET');--> statement-breakpoint
CREATE TABLE "activation_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_label" text,
	"package_name" text NOT NULL,
	"app_version_name" text,
	"app_version_code" integer,
	"device_hash" text NOT NULL,
	"device_summary" jsonb NOT NULL,
	"fingerprint_payload" jsonb NOT NULL,
	"status" "activation_request_status" DEFAULT 'PENDING' NOT NULL,
	"decision_note" text,
	"created_by_ip" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_invocation_locks" (
	"key" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_email" text,
	"actor_role" "user_role",
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text,
	"license_id" text,
	"note" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_events" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"request_id" text,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"device_hash" text NOT NULL,
	"product" text NOT NULL,
	"package_name" text NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"token_hash" text NOT NULL,
	"signed_token" jsonb NOT NULL,
	"status" "license_status" DEFAULT 'ACTIVE' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"not_before" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"token_validity_days" integer NOT NULL,
	"renewal_window_days" integer NOT NULL,
	"activation_enabled" boolean DEFAULT true NOT NULL,
	"allow_admin_approvals" boolean DEFAULT true NOT NULL,
	"public_key_id" text NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_token_hash" text NOT NULL,
	"csrf_secret_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"force_password_reset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activation_requests" ADD CONSTRAINT "activation_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_notes" ADD CONSTRAINT "device_notes_request_id_activation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."activation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_notes" ADD CONSTRAINT "device_notes_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_notes" ADD CONSTRAINT "device_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_events" ADD CONSTRAINT "license_events_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_events" ADD CONSTRAINT "license_events_request_id_activation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."activation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_events" ADD CONSTRAINT "license_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_request_id_activation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."activation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activation_requests_device_hash_idx" ON "activation_requests" USING btree ("device_hash");--> statement-breakpoint
CREATE INDEX "activation_requests_status_idx" ON "activation_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_invocation_locks_action_idx" ON "admin_invocation_locks" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "licenses_device_hash_idx" ON "licenses" USING btree ("device_hash");--> statement-breakpoint
CREATE INDEX "licenses_request_id_idx" ON "licenses" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_token_hash_unique" ON "licenses" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_session_token_hash_unique" ON "sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");