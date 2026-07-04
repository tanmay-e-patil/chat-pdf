import "server-only";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { chats } from "./db/schema";

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  return userId;
}

export async function getOwnedChat(chatId: string, userId: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  return chat;
}

export async function getOwnedChatByFileKey(fileKey: string, userId: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.fileKey, fileKey), eq(chats.userId, userId)))
    .limit(1);

  return chat;
}
