import {pgEnum, pgTable, text, timestamp, uuid, varchar} from 'drizzle-orm/pg-core'


export const userSystemEnum = pgEnum('user_system_enum', ['assistant', 'user'])

export const chats = pgTable('chats', {
    id: uuid('id').primaryKey().defaultRandom(),  
    pdfName: text('pdf_name').notNull(),
    pdfUrl: text('pdf_url').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    userId: varchar('user_id', {length:256}).notNull(),
    fileKey: text('file_key').notNull(),
})

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: uuid('chat_id').references(() => chats.id).notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    userId: varchar('user_id', {length:256}).notNull(),
})