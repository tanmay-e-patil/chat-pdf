-- Existing chats get index_version 0: ready rows read as stale and are rebuilt on next view;
-- processing rows with no start time read as queued and are re-dispatched on next view.
-- ingestion_error stores a failure code (see INDEX_FAILURES in src/lib/document-index/shared.ts).
ALTER TABLE "chats"
  ADD COLUMN IF NOT EXISTS "ingestion_started_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "index_version" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE "chats"
SET "ingestion_error" = CASE
  WHEN "ingestion_error" = 'No PDF text chunks to index' THEN 'no_text_layer'
  WHEN "ingestion_error" = 'Failed to download file from S3' THEN 'file_missing'
  WHEN "ingestion_error" = 'Failed to embed document' THEN 'embedding_failed'
  WHEN "ingestion_error" = 'AWS_INGESTION_LAMBDA_NAME is required' THEN 'dispatch_failed'
  ELSE 'unknown'
END
WHERE "ingestion_status" = 'failed';
--> statement-breakpoint
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "citations" jsonb NOT NULL DEFAULT '[]'::jsonb;
