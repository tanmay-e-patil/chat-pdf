ALTER TABLE "messages"
  DROP CONSTRAINT IF EXISTS "messages_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_chat_id_chats_id_fk"
  FOREIGN KEY ("chat_id")
  REFERENCES "public"."chats"("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_user_id_idx"
  ON "chats" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_user_id_file_key_idx"
  ON "chats" ("user_id", "file_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_chat_id_user_id_idx"
  ON "messages" ("chat_id", "user_id");
