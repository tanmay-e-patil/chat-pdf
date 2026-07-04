import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { deleteFromPinecone } from "@/lib/pinecone";
import { deleteFromS3 } from "@/lib/s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json(chat, { status: 200 });
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await Promise.allSettled([
    deleteFromPinecone(chat.fileKey),
    deleteFromS3(chat.fileKey),
  ]);

  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
    .execute();
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .execute();

  return NextResponse.json(chat.fileKey, { status: 200 });
};
