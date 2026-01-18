-- Migration: Add generation_job table for PostgreSQL-based job queue
-- Date: 2026-01-16

-- Create the generation_job table
CREATE TABLE IF NOT EXISTS "generation_job" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"flow_id" text,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

-- Add foreign key constraints
ALTER TABLE "generation_job"
  ADD CONSTRAINT "generation_job_client_id_client_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."client"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "generation_job"
  ADD CONSTRAINT "generation_job_flow_id_generation_flow_id_fk"
  FOREIGN KEY ("flow_id") REFERENCES "public"."generation_flow"("id")
  ON DELETE set null ON UPDATE no action;

-- Create indexes for efficient job processing
CREATE INDEX IF NOT EXISTS "idx_generation_job_claimable" ON "generation_job" USING btree ("priority","created_at");
CREATE INDEX IF NOT EXISTS "idx_generation_job_flow" ON "generation_job" USING btree ("flow_id");
CREATE INDEX IF NOT EXISTS "idx_generation_job_client" ON "generation_job" USING btree ("client_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_generation_job_status" ON "generation_job" USING btree ("status");

