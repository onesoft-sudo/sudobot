DO $$ BEGIN
 CREATE TYPE "public"."command_permission_overwrite_action" AS ENUM('Allow', 'Deny');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
DO $$ BEGIN
 CREATE TYPE "public"."permission_logic_mode" AS ENUM('And', 'Or');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_method" AS ENUM('discord', 'github', 'google', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "afk_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" varchar,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"mentions" varchar[] DEFAULT '{}' NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"global" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"channel_id" varchar NOT NULL,
	"permissions" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "command_permission_overwrites" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"commands" text[] DEFAULT '{}' NOT NULL,
	"required_discord_permissions" json DEFAULT 'null'::json,
	"required_system_permissions" json DEFAULT 'null'::json,
	"required_roles" json DEFAULT 'null'::json,
	"required_users" json DEFAULT 'null'::json,
	"required_channels" json DEFAULT 'null'::json,
	"required_level" integer,
	"disabled" boolean DEFAULT false,
	"on_match" "command_permission_overwrite_action" DEFAULT 'Allow' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
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
	"delivery_status" "infraction_delivery_status" DEFAULT 'Success' NOT NULL,
	"queue_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mute_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"roles" varchar[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"level" integer NOT NULL,
	"disabled" boolean DEFAULT false,
	"granted_discord_permissions" text[] DEFAULT '{}' NOT NULL,
	"granted_system_permissions" text[] DEFAULT '{}' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"users" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_overwrites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"guild_id" varchar NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"users" text[] DEFAULT '{}' NOT NULL,
	"granted_discord_permissions" text[] DEFAULT '{}' NOT NULL,
	"granted_system_permissions" text[] DEFAULT '{}' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"merge" boolean DEFAULT true NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queues" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"channel_id" varchar,
	"message_id" varchar,
	"name" varchar NOT NULL,
	"repeat" boolean DEFAULT false,
	"data" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"runs_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reaction_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"emoji" varchar,
	"is_built_in_emoji" boolean DEFAULT false NOT NULL,
	"guild_id" varchar NOT NULL,
	"channel_id" varchar NOT NULL,
	"message_id" varchar NOT NULL,
	"roles" varchar[] DEFAULT '{}' NOT NULL,
	"required_roles" varchar[] DEFAULT '{}' NOT NULL,
	"blacklisted_users" varchar[] DEFAULT '{}' NOT NULL,
	"required_permissions" varchar[] DEFAULT '{}' NOT NULL,
	"level" integer,
	"single" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snippets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"aliases" varchar[] DEFAULT '{}' NOT NULL,
	"roles" varchar[] DEFAULT '{}' NOT NULL,
	"channels" varchar[] DEFAULT '{}' NOT NULL,
	"users" varchar[] DEFAULT '{}' NOT NULL,
	"attachments" varchar[] DEFAULT ARRAY[]::varchar[] NOT NULL,
	"content" varchar[] DEFAULT ARRAY[]::varchar[] NOT NULL,
	"randomize" boolean DEFAULT false NOT NULL,
	"permissions" varchar[] DEFAULT ARRAY[]::varchar[] NOT NULL,
	"permission_mode" "permission_logic_mode" DEFAULT 'And' NOT NULL,
	"level" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"username" varchar NOT NULL,
	"discord_id" varchar NOT NULL,
	"github_id" varchar,
	"guilds" varchar[] DEFAULT '{}' NOT NULL,
	"password" varchar NOT NULL,
	"token" varchar,
	"recovery_token" varchar,
	"recovery_code" varchar,
	"recovery_attempts" integer DEFAULT 0 NOT NULL,
	"recovery_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"token_expires_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"code" varchar NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_entries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"discord_id" varchar,
	"github_id" varchar,
	"google_id" varchar,
	"email" varchar,
	"method" "verification_method" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
