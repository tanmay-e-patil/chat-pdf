import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { clearConversation } from "@/lib/chat-messages";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { deleteDocumentIndex, indexStateOf } from "@/lib/document-index";
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

  return NextResponse.json({ indexState: indexStateOf(chat) }, { status: 200 });
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
    deleteDocumentIndex(chat),
    deleteFromS3(chat.fileKey),
  ]);

  // Don't rely on the 0002 cascade: databases without it reject the chat delete.
  await clearConversation(chatId, userId);
  await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .execute();

  return NextResponse.json(chat.fileKey, { status: 200 });
};
