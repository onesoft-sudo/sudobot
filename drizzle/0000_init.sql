CREATE TYPE "public"."command_permission_overwrite_action" AS ENUM('Allow', 'Deny');--> statement-breakpoint
CREATE TYPE "public"."infraction_delivery_status" AS ENUM('Success', 'Failed', 'Fallback', 'NotDelivered');--> statement-breakpoint
CREATE TYPE "public"."infraction_type" AS ENUM('Ban', 'Kick', 'Mute', 'Warning', 'MassBan', 'MassKick', 'Unban', 'Unmute', 'BulkDeleteMessage', 'Timeout', 'TimeoutRemove', 'Bean', 'Note', 'Role', 'ModMessage', 'Shot', 'ReactionClear');--> statement-breakpoint
CREATE TYPE "public"."permission_logic_mode" AS ENUM('And', 'Or');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'discord_authorized');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('channel_interaction', 'dm_interaction', 'channel_static_interaction');--> statement-breakpoint
CREATE TABLE "afk_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" varchar,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"mentions" varchar[] DEFAULT '{}' NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"global" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alt_fingerprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"fingerprint" varchar NOT NULL,
	"type" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"channel_id" varchar NOT NULL,
	"permissions" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "command_permission_overwrites" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_message_inspection_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "mute_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"roles" varchar[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"level" integer NOT NULL,
	"disabled" boolean DEFAULT false,
	"granted_discord_permissions" text[] DEFAULT '{}' NOT NULL,
	"granted_system_permissions" text[] DEFAULT '{}' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"users" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_overwrites" (
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
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"channel_id" varchar,
	"message_id" varchar,
	"name" varchar NOT NULL,
	"repeat" boolean DEFAULT false,
	"data" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"runs_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reaction_roles" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snippets" (
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
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
	"recovery_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"token_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"code" varchar NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"method" "verification_method" NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"guild_ids" text[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_entries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "verification_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"method" "verification_method" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
