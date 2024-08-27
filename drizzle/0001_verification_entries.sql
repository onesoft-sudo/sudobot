ALTER TYPE "verification_method" ADD VALUE 'channel_interaction';--> statement-breakpoint
ALTER TYPE "verification_method" ADD VALUE 'dm_interaction';--> statement-breakpoint
ALTER TABLE "verification_entries" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_entries" ADD COLUMN "method" "verification_method" NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_records" DROP COLUMN IF EXISTS "discord_id";--> statement-breakpoint
ALTER TABLE "verification_records" DROP COLUMN IF EXISTS "github_id";--> statement-breakpoint
ALTER TABLE "verification_records" DROP COLUMN IF EXISTS "google_id";--> statement-breakpoint
ALTER TABLE "verification_records" DROP COLUMN IF EXISTS "email";