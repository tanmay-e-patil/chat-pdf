import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

const userSystemEnum = pgEnum("user_system_enum", ["assistant", "user"]);
const ingestionStatusEnum = pgEnum("ingestion_status_enum", [
  "processing",
  "ready",
  "failed",
]);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pdfName: text("pdf_name").notNull(),
    pdfUrl: text("pdf_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    fileKey: text("file_key").notNull(),
    ingestionStatus: ingestionStatusEnum("ingestion_status")
      .notNull()
      .default("processing"),
    ingestionError: text("ingestion_error"),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_user_id_file_key_idx").on(table.userId, table.fileKey),
  ],
);

export type DrizzleChat = typeof chats.$inferSelect;

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .references(() => chats.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    role: userSystemEnum("role").notNull(),
  },
  (table) => [
    index("messages_chat_id_user_id_idx").on(table.chatId, table.userId),
  ],
);

export const subscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 256 }).notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 256 })
    .notNull()
    .unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", {
    length: 256,
  }).unique(),
  stripePriceId: varchar("stripe_price_id", { length: 256 }),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
});
