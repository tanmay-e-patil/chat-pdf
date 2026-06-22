import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { deleteFromPinecone } from "@/lib/pinecone";
import { deleteFromS3 } from "@/lib/s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const { chatId } = await params;
  const _chats = await db.select().from(chats).where(eq(chats.id, chatId));

  if (_chats.length === 0) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json(_chats[0], { status: 200 });
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const { chatId } = await params;
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await Promise.allSettled([
    deleteFromPinecone(chat.fileKey),
    deleteFromS3(chat.fileKey),
  ]);

  await db.delete(messages).where(eq(messages.chatId, chatId)).execute();
  await db.delete(chats).where(eq(chats.id, chatId)).execute();

  return NextResponse.json(chat.fileKey, { status: 200 });
};
