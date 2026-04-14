CREATE TYPE "public"."anomaly_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."anomaly_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."device_registry_status" AS ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED', 'BLOCKED');--> statement-breakpoint
CREATE TABLE "anomaly_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text,
	"request_id" text,
	"license_id" text,
	"type" text NOT NULL,
	"severity" "anomaly_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "anomaly_status" DEFAULT 'OPEN' NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_by_user_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"mac_hash" text NOT NULL,
	"primary_mac" text NOT NULL,
	"status" "device_registry_status" DEFAULT 'PENDING' NOT NULL,
	"current_device_hash" text,
	"current_package_name" text,
	"current_license_id" text,
	"last_request_id" text,
	"device_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blocked_reason" text,
	"unbound_reason" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_approved_at" timestamp with time zone,
	"blocked_at" timestamp with time zone,
	"unbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "token_version" SET DEFAULT 2;--> statement-breakpoint
ALTER TABLE "activation_requests" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "activation_requests" ADD COLUMN "mac_hash" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "mac_hash" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "key_id" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "nonce" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_device_id_device_registry_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_request_id_activation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."activation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anomaly_flags_device_idx" ON "anomaly_flags" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "anomaly_flags_request_idx" ON "anomaly_flags" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "anomaly_flags_status_idx" ON "anomaly_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "anomaly_flags_severity_idx" ON "anomaly_flags" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "device_registry_mac_hash_unique" ON "device_registry" USING btree ("mac_hash");--> statement-breakpoint
CREATE INDEX "device_registry_status_idx" ON "device_registry" USING btree ("status");--> statement-breakpoint
ALTER TABLE "activation_requests" ADD CONSTRAINT "activation_requests_device_id_device_registry_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_device_id_device_registry_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activation_requests_device_id_idx" ON "activation_requests" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "activation_requests_mac_hash_idx" ON "activation_requests" USING btree ("mac_hash");--> statement-breakpoint
CREATE INDEX "licenses_device_id_idx" ON "licenses" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "licenses_mac_hash_idx" ON "licenses" USING btree ("mac_hash");