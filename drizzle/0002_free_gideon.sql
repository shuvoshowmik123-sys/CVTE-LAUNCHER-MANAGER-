ALTER TABLE "device_notes" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "device_registry" ADD COLUMN "request_public_key_pem" text;--> statement-breakpoint
ALTER TABLE "device_registry" ADD COLUMN "request_key_algorithm" text;--> statement-breakpoint
ALTER TABLE "device_registry" ADD COLUMN "last_request_nonce" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "device_registry" ADD COLUMN "last_request_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device_notes" ADD CONSTRAINT "device_notes_device_id_device_registry_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_registry"("id") ON DELETE cascade ON UPDATE no action;