CREATE TABLE "alt_fingerprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"fingerprint" varchar NOT NULL,
	"type" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "alt_fingerprints_user_id_type_fingerprint_idx" ON "alt_fingerprints" ("user_id", "type", "fingerprint");