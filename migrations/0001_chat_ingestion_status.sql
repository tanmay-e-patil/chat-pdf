DO $$ BEGIN
  CREATE TYPE "ingestion_status_enum" AS ENUM ('processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "chats"
  ADD COLUMN IF NOT EXISTS "ingestion_status" "ingestion_status_enum" NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS "ingestion_error" text;
--> statement-breakpoint
ALTER TABLE "chats"
  ALTER COLUMN "ingestion_status" SET DEFAULT 'processing';
