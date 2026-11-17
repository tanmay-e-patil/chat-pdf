-- Pre-0001 schema. Idempotent, so it is safe to run against an existing database.

DO $$ BEGIN
  CREATE TYPE "user_system_enum" AS ENUM ('assistant', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pdf_name" text NOT NULL,
  "pdf_url" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "user_id" varchar(256) NOT NULL,
  "file_key" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chat_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "user_id" varchar(256) NOT NULL,
  "role" "user_system_enum" NOT NULL,
  CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id")
);

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(256) NOT NULL,
  "stripe_customer_id" varchar(256) NOT NULL,
  "stripe_subscription_id" varchar(256),
  "stripe_price_id" varchar(256),
  "stripe_current_period_end" timestamp,
  CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE ("user_id"),
  CONSTRAINT "user_subscriptions_stripe_customer_id_unique" UNIQUE ("stripe_customer_id"),
  CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id")
);

