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
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
