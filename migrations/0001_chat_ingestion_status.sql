CREATE TYPE "ingestion_status_enum" AS ENUM ('processing', 'ready', 'failed');

ALTER TABLE "chats"
  ADD COLUMN "ingestion_status" "ingestion_status_enum" NOT NULL DEFAULT 'ready',
  ADD COLUMN "ingestion_error" text;

ALTER TABLE "chats"
  ALTER COLUMN "ingestion_status" SET DEFAULT 'processing';
