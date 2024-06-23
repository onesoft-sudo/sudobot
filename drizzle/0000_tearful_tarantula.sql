DO $$ BEGIN
 CREATE TYPE "public"."infraction_delivery_status" AS ENUM('Success', 'Failed', 'Fallback', 'NotDelivered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."infraction_type" AS ENUM('Ban', 'Kick', 'Mute', 'Warning', 'MassBan', 'MassKick', 'Unban', 'Unmute', 'BulkDeleteMessage', 'Timeout', 'TimeoutRemove', 'Bean', 'Note', 'Role', 'ModMessage', 'Shot');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "infractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "infraction_type" NOT NULL,
	"user_id" varchar NOT NULL,
	"moderator_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"reason" varchar,
	"expires_at" timestamp,
	"metadata" json,
	"delivery_status" "infraction_delivery_status" DEFAULT 'Success',
	"queue_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
