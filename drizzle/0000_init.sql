CREATE TYPE "public"."infraction_delivery_status" AS ENUM('Success', 'Failed', 'Fallback', 'NotDelivered');--> statement-breakpoint
CREATE TYPE "public"."infraction_type" AS ENUM('Ban', 'Kick', 'Mute', 'Warning', 'MassBan', 'MassKick', 'Unban', 'Unmute', 'BulkDeleteMessage', 'Timeout', 'TimeoutRemove', 'Bean', 'Note', 'Role', 'ModMessage', 'Shot', 'ReactionClear');--> statement-breakpoint
CREATE TABLE "infractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "infraction_type" NOT NULL,
	"user_id" varchar NOT NULL,
	"moderator_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"reason" varchar,
	"expires_at" timestamp with time zone,
	"metadata" json,
	"delivery_status" "infraction_delivery_status" DEFAULT 'Success' NOT NULL,
	"attachments" text[] DEFAULT '{}' NOT NULL,
	"queue_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"level" integer NOT NULL,
	"disabled" boolean DEFAULT false,
	"granted_discord_permissions" bigint DEFAULT '0' NOT NULL,
	"granted_system_permissions" text[] DEFAULT '{}' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"users" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
