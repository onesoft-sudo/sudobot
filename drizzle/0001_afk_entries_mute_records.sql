CREATE TABLE "afk_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" varchar,
	"user_id" varchar NOT NULL,
	"guild_id" varchar NOT NULL,
	"mentions" varchar[] DEFAULT '{}' NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
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
