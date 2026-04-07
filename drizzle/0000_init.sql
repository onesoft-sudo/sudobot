CREATE TYPE "public"."infraction_delivery_status" AS ENUM('Success', 'Failed', 'Fallback', 'NotDelivered');--> statement-breakpoint
CREATE TYPE "public"."infraction_type" AS ENUM('Ban', 'Kick', 'Mute', 'Warning', 'MassBan', 'MassKick', 'Unban', 'Unmute', 'BulkDeleteMessage', 'Timeout', 'TimeoutRemove', 'Bean', 'Note', 'Role', 'Shot', 'ModeratorMessage', 'ReactionClear');--> statement-breakpoint
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"disabled" boolean DEFAULT false,
	"granted_discord_permissions" bigint DEFAULT '0' NOT NULL,
	"granted_system_permissions" text[] DEFAULT '{}' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"users" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queued_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"guild_id" varchar,
	"channel_id" varchar,
	"message_id" varchar,
	"name" varchar NOT NULL,
	"repeat" boolean DEFAULT false,
	"data" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"runs_at" timestamp with time zone NOT NULL
);
